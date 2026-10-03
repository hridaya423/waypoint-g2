import json
import os
from pathlib import Path
import signal
import subprocess
import time
import urllib.request
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
binary = root / 'node_modules/@evenrealities/sim-darwin-arm64/bin/evenhub-simulator'
out = root / os.environ.get('WAYPOINT_CAPTURES', 'docs/design/quiet')
out.mkdir(parents=True, exist_ok=True)
cases = ['idle','route','walking','boarding','riding','stop','requested','alighting','arrived','uncertain','details','london','browse','rail','boarding-live','boarding-stale','transfer','dedup','trip-walk','trip-bus','trip-final-walk','detected']
cases = os.environ.get('WAYPOINT_CASES', ','.join(cases)).split(',')
results = []
for case in cases:
    log = open(out / f'{case}.log', 'w')
    process = subprocess.Popen([str(binary), f'http://localhost:5173/tests/hud-gallery.html?case={case}', '--automation-port', '9898'], cwd=root, stdout=log, stderr=log, start_new_session=True)
    try:
        deadline = time.monotonic() + 35
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError(f'Simulator exited for {case}')
            try:
                console = json.load(urllib.request.urlopen('http://127.0.0.1:9898/api/console', timeout=1))
                entries = console['entries']
                errors = [e for e in entries if e['level'] == 'error' or '[unhandledrejection]' in e['message']]
                if errors:
                    raise RuntimeError(str(errors))
                calls = [e for e in entries if 'Flutter Bridge intercepted' in e['message']]
                if len(calls) >= 5:
                    break
            except (OSError, ValueError):
                pass
            time.sleep(.2)
        else:
            raise RuntimeError(f'No completed frame for {case}')
        time.sleep(.8 if case == "dedup" else .2)
        console = json.load(urllib.request.urlopen("http://127.0.0.1:9898/api/console"))
        calls = [e for e in console["entries"] if "Flutter Bridge intercepted" in e["message"]]
        if case == "dedup": assert len(calls) == 5, calls
        raw = urllib.request.urlopen('http://127.0.0.1:9898/api/screenshot/glasses').read()
        (out / f'{case}.png').write_bytes(raw)
        frame = Image.open(out / f'{case}.png')
        visible = Image.new('RGBA', frame.size, 'black')
        visible.alpha_composite(frame)
        visible.convert('RGB').save(out / f'{case}-visible.png')
        (out / f'{case}-console.json').write_text(json.dumps(console, indent=2))
        results.append({'case':case,'calls':len(calls),'first_frame_bridge_span_ms':calls[-1]['ts']-calls[0]['ts'],'errors':errors})
        print(case, 'captured', flush=True)
    finally:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
        log.close()
        time.sleep(.2)
sheet=Image.new('RGB',(576*3,320*((len(cases)+2)//3)),'#111')
draw=ImageDraw.Draw(sheet)
for i,case in enumerate(cases):
    x=(i%3)*576;y=(i//3)*320
    draw.text((x+12,y+8),case,fill='white')
    sheet.paste(Image.open(out/f'{case}-visible.png'),(x,y+32))
sheet.save(out/'contact-sheet.png')
(out/'capture-results.json').write_text(json.dumps(results,indent=2))
