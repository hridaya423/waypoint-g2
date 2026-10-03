import type { HudScene } from "./hud.ts";
import { hudTiles } from "./renderHud.ts";
import type { EvenAppBridge } from "@evenrealities/even_hub_sdk";
import type { Fix } from "./model.ts";
declare global {
  interface Window {
    flutter_inappwebview?: {
      callHandler: (...args: unknown[]) => Promise<unknown>;
    };
  }
}
export type GlassesAction = "select" | "previous" | "next" | "exit" | "live";
export type DeviceState = {
  status: string;
  connected: boolean;
  battery: number | null;
  error: string;
};
export class Glasses {
  private bridge: EvenAppBridge | null = null;
  private pending: HudScene | null = null;
  private sending = false;
  private sent: Uint8Array[] = [];
  private cleanups: (() => void)[] = [];
  private closed = false;
  onAction: (action: GlassesAction) => void = () => {};
  onFix: (fix: Fix) => void = () => {};
  onAudio: (bytes: number) => void = () => {};
  onState: (state: DeviceState) => void = () => {};
  state: DeviceState = {
    status: "Browser preview",
    connected: false,
    battery: null,
    error: "",
  };
  get available() {
    return this.bridge !== null;
  }
  private update(patch: Partial<DeviceState>) {
    this.state = { ...this.state, ...patch };
    this.onState(this.state);
  }
  async connect() {
    if (this.bridge) return;
    for (let i = 0; i < 20 && !window.flutter_inappwebview && !this.closed; i++)
      await new Promise((resolve) => setTimeout(resolve, 250));
    if (!window.flutter_inappwebview || this.closed) return;
    try {
      const sdk = await import("@evenrealities/even_hub_sdk");
      const bridge = await sdk.waitForEvenAppBridge();
      if (this.closed) return;
      this.bridge = bridge;
      const created = await bridge.createStartUpPageContainer(
        new sdk.CreateStartUpPageContainer({
          containerTotalNum: 5,
          textObject: [
            new sdk.TextContainerProperty({
              containerID: 1,
              containerName: "input",
              xPosition: 0,
              yPosition: 0,
              width: 576,
              height: 288,
              isEventCapture: 1,
              content: " ",
              textColor: 0,
              zOrderIndex: 0,
            }),
          ],
          imageObject: [
            [0, 0],
            [288, 0],
            [0, 144],
            [288, 144],
          ].map(
            ([x, y], index) =>
              new sdk.ImageContainerProperty({
                containerID: index + 2,
                containerName: `hud-${index}`,
                xPosition: x,
                yPosition: y,
                width: 288,
                height: 144,
                zOrderIndex: index + 1,
              }),
          ),
        }),
      );
      if (created !== sdk.StartUpPageCreateResult.success)
        throw new Error(`G2 rejected the display (${created}).`);
      this.update({ status: "Even bridge ready", connected: true, error: "" });
      this.cleanups.push(
        bridge.onDeviceStatusChanged((status) => {
          this.sent = [];
          this.update({
            connected: status.connectType === sdk.DeviceConnectType.Connected,
            status: status.connectType,
            battery: status.batteryLevel ?? null,
          });
        }),
      );
      this.cleanups.push(
        bridge.onAppLocationChanged((location) => {
          this.onFix({
            lat: location.latitude,
            lon: location.longitude,
            accuracy: location.accuracy ?? Infinity,
            timestamp: location.timestamp ?? 0,
            speed: location.speed,
          });
        }),
      );
      this.cleanups.push(
        bridge.onEvenHubEvent((event) => {
          if (event.audioEvent) this.onAudio(event.audioEvent.audioPcm.length);
          const input = event.textEvent || event.listEvent || event.sysEvent;
          if (!input || event.audioEvent) return;
          const type = input.eventType;
          if (
            type === sdk.OsEventTypeList.SYSTEM_EXIT_EVENT ||
            type === sdk.OsEventTypeList.ABNORMAL_EXIT_EVENT
          ) {
            this.onAction("exit");
            void this.location(false).catch((error) =>
              this.update({ error: String(error) }),
            );
            void this.microphone(false).catch((error) =>
              this.update({ error: String(error) }),
            );
          } else if (type === sdk.OsEventTypeList.DOUBLE_CLICK_EVENT) {
            void bridge
              .shutDownPageContainer(1)
              .then((success) => {
                if (!success)
                  this.update({ error: "Exit request was not accepted." });
              })
              .catch((error) => this.update({ error: String(error) }));
          } else if (type === sdk.OsEventTypeList.SCROLL_TOP_EVENT)
            this.onAction("previous");
          else if (type === sdk.OsEventTypeList.LONG_PRESS_EVENT)
            this.onAction("live");
          else if (type === sdk.OsEventTypeList.SCROLL_BOTTOM_EVENT)
            this.onAction("next");
          else if (
            type === sdk.OsEventTypeList.CLICK_EVENT ||
            (type === undefined &&
              (event.textEvent || event.sysEvent?.eventSource !== undefined))
          )
            this.onAction("select");
        }),
      );
      this.sent = [];
    } catch (error) {
      this.bridge = null;
      this.update({
        status: "Connection failed",
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect to Even Hub.",
      });
    }
  }
  async currentLocation(): Promise<Fix> {
    if (!this.bridge) {
      const p = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }),
      );
      return {
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        accuracy: p.coords.accuracy,
        timestamp: p.timestamp,
      };
    }
    const sdk = await import("@evenrealities/even_hub_sdk");
    const p = await this.bridge.getAppLocation({
      accuracy: sdk.AppLocationAccuracy.High,
      timeoutMs: 12000,
    });
    if (!p)
      throw new Error(
        "Current location unavailable. Check location permissions.",
      );
    return {
      lat: p.latitude,
      lon: p.longitude,
      accuracy: p.accuracy ?? Infinity,
      timestamp: p.timestamp ?? 0,
    };
  }
  async location(enabled: boolean) {
    if (!this.bridge) return false;
    const sdk = await import("@evenrealities/even_hub_sdk");
    const success = enabled
      ? await this.bridge.startAppLocationUpdates({
          accuracy: sdk.AppLocationAccuracy.High,
          intervalMs: 1500,
          distanceFilter: 3,
        })
      : await this.bridge.stopAppLocationUpdates();
    if (!success)
      this.update({
        error: enabled
          ? "Location stream was not started. Check Even App permissions."
          : "Location stream did not acknowledge stopping.",
      });
    return success;
  }
  async microphone(enabled: boolean) {
    if (!this.bridge)
      throw new Error(
        "Open Waypoint inside Even Hub to test the glasses microphone.",
      );
    if (!(await this.bridge.audioControl(enabled)))
      throw new Error("Microphone request was not accepted.");
  }
  display(frame: HudScene) {
    this.pending = frame;
    if (!this.sending) void this.flush();
  }
  private async flush() {
    if (!this.bridge || !this.state.connected || this.closed) return;
    this.sending = true;
    try {
      const sdk = await import("@evenrealities/even_hub_sdk");
      while (this.pending) {
        const frame = this.pending;
        this.pending = null;
        const tiles = hudTiles(frame);
        for (const [index, tile] of tiles.entries()) {
          if (this.pending || this.closed || !this.state.connected) break;
          if (this.sent[index]?.every((pixel, i) => pixel === tile[i]))
            continue;
          const result = await this.bridge.updateImageRawData(
            new sdk.ImageRawDataUpdate({
              containerID: index + 2,
              containerName: `hud-${index}`,
              imageData: tile,
            }),
          );
          if (!sdk.ImageRawDataUpdateResult.isSuccess(result))
            throw new Error(
              `Glasses image update failed (${result}). Reopen the app.`,
            );
          this.sent[index] = tile;
        }
      }
    } catch (error) {
      this.update({
        error:
          error instanceof Error ? error.message : "Display update failed.",
      });
    } finally {
      this.sending = false;
    }
  }
  dispose() {
    this.closed = true;
    this.cleanups.forEach((cleanup) => cleanup());
    void this.bridge
      ?.stopAppLocationUpdates()
      .catch((error) => this.update({ error: String(error) }));
    void this.bridge
      ?.audioControl(false)
      .catch((error) => this.update({ error: String(error) }));
  }
}
