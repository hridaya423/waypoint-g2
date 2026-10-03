import type { useWaypoint } from "./useWaypoint.ts";
export function DevicePanel({ w }: { w: ReturnType<typeof useWaypoint> }) {
  return (
    <section className="diagnostics">
      <div className="panel">
        <h2>G2 connection</h2>
        <p>
          {w.device.status}
          {w.device.battery !== null ? ` · ${w.device.battery}% battery` : ""}
        </p>
        <p className="muted">
          Open the installed app in Even Hub to connect. A desktop browser shows
          the interface without a glasses connection.
        </p>
        <h3>Five-minute lock test</h3>
        {w.journey && (
          <p className="fine">
            End your journey before starting the display test.
          </p>
        )}
        <p>
          Start this test, lock your phone, and watch whether the counter in
          your glasses keeps moving. Unlock after five minutes and export the
          results.
        </p>
        <div className="buttons">
          <button
            className="primary"
            onClick={w.runProbe}
            disabled={w.probeActive || !!w.journey}
          >
            Start test
          </button>
          {w.probeActive && (
            <button onClick={() => w.setProbeActive(false)}>Stop test</button>
          )}
          <button disabled={!w.probe} onClick={w.exportProbe}>
            Export results
          </button>
        </div>
        {w.probe && (
          <dl>
            <dt>Timer callbacks</dt>
            <dd>{w.probe.ticks}</dd>
            <dt>Longest timer gap</dt>
            <dd>{(w.probe.maxGap / 1000).toFixed(1)} s</dd>
            <dt>Location callbacks</dt>
            <dd>{w.probe.fixes}</dd>
            <dt>Microphone bytes received</dt>
            <dd>{w.probe.audioBytes}</dd>
          </dl>
        )}
        <h3>Microphone capability</h3>
        <p className="muted">
          This ten-second test counts received audio bytes. It does not record
          or upload audio, and voice commands are not implemented.
        </p>
        <button
          disabled={!w.device.connected || w.micActive}
          onClick={() => void w.microphone()}
        >
          {w.micActive ? "Testing microphone…" : "Test microphone"}
        </button>
      </div>
      <div className="panel">
        <h2>What still needs field testing</h2>
        <p>
          Phone lock, app suspension, Bluetooth recovery and alert visibility
          must be checked on real hardware before relying on this for a journey.
        </p>
        <p>
          Bus boarding detection is experimental. Confirm manually when it
          misses a transition; rail boarding needs confirmation. Underground
          location may be unavailable, so precise alerts pause when progress
          cannot be established.
        </p>
        <p>
          National Rail delay feeds, voice destinations and automatic vehicle
          identification are planned, not implemented.
        </p>
      </div>
    </section>
  );
}
