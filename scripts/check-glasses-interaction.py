import json
import os
from pathlib import Path
import signal
import subprocess
import time
import urllib.request
from PIL import Image

root = Path(__file__).resolve().parent.parent
binary = root / 'node_modules/@evenrealities/sim-darwin-arm64/bin/evenhub-simulator'
out = root / os.environ.get('WAYPOINT_CAPTURES', 'docs/design/quiet')
out.mkdir(parents=True,exist_ok=True)
base = 'http://127.0.0.1:9898'
app_url = os.environ.get('WAYPOINT_URL', 'http://localhost:5173')
scenarios = {
    'riding': [('click','details'),('down','next-stop'),('up','previous-stop'),('long_press','live'),('long_press_release',None),('click','detail-before-return'),('click','ride-map'),('click','timeline-after-map'),('click','detail-before-return'),('wait','automatic-live')],
    'stop': [('click','stop-acknowledged')],
    'alighting': [('click','arrival'),('click','finished')],
    'uncertain': [('click','confirm-off'),('down','cancel-off'),('click',None),('click','manual-arrival')],
    'boarding': [('click','boarded')],
    'detected': [('click','undo-detection'),('click','manual-board-after-undo')]
}
results=[]
for scenario, actions in scenarios.items():
    log=open(out/f'interaction-{scenario}.log','w')
    process=subprocess.Popen([str(binary),f'{app_url}/?rehearsal={scenario}','--automation-port','9898'],cwd=root,stdout=log,stderr=log,start_new_session=True)
    try:
        for attempt in range(75):
            try:
                console=json.load(urllib.request.urlopen(base+'/api/console',timeout=1))
                if sum('Flutter Bridge intercepted' in e['message'] for e in console['entries'])>=5:break
            except (OSError,ValueError):pass
            time.sleep(.2)
        else:raise RuntimeError('Simulator did not create the initial frame')
        time.sleep(.2)
        for action,name in actions:
            if action == 'wait': time.sleep(12.5)
            else: urllib.request.urlopen(urllib.request.Request(base+'/api/input',data=json.dumps({'action':action}).encode(),headers={'Content-Type':'application/json'})).read()
            time.sleep(.7)
            if name:
                target=out/f'interaction-{name}.png'
                target.write_bytes(urllib.request.urlopen(base+'/api/screenshot/glasses').read())
                frame=Image.open(target);visible=Image.new('RGBA',frame.size,'black');visible.alpha_composite(frame);visible.convert('RGB').save(out/f'interaction-{name}-visible.png')
        if scenario == 'riding':
            assert Image.open(out/'interaction-live.png').tobytes() == Image.open(out/'interaction-automatic-live.png').tobytes(), 'Automatic return did not restore the live frame'
        console=json.load(urllib.request.urlopen(base+'/api/console'))
        errors=[e for e in console['entries'] if e['level']=='error' or '[unhandledrejection]' in e['message']]
        events=[e for e in console['entries'] if 'EvenHub event' in e['message']]
        assert not errors,errors
        assert len(events)==sum(action != 'wait' for action,name in actions),(scenario,len(events),len(actions))
        results.append({'scenario':scenario,'events':len(events),'errors':errors})
        (out/f'interaction-{scenario}-console.json').write_text(json.dumps(console,indent=2))
        print(scenario,'verified event delivery; screenshots saved',flush=True)
    finally:
        os.killpg(process.pid,signal.SIGTERM)
        try:process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid,signal.SIGKILL);process.wait()
        log.close();time.sleep(.2)
(out/'interaction-results.json').write_text(json.dumps(results,indent=2))
