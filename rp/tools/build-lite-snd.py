# Звук для однофайловой версии: моно, 40 кбит/с; длинные петли укорачиваются до 12 с с бесшовной склейкой
# (хвост плавно накладывается на начало), разовые звуки — до 6 с с затуханием.
# Запуск: python3 tools/build-lite-snd.py <папка-вывода>   (нужен ffmpeg в PATH или FFMPEG=…)
import os, sys, subprocess, json, shutil
FF = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or 'ffmpeg'
SRC, OUT = 'public/assets/snd', (sys.argv[1] if len(sys.argv) > 1 else 'lite') + '/snd'
LOOPS = {'amb_city', 'amb_street', 'amb_night_city', 'amb_yard', 'amb_kids', 'amb_crickets', 'amb_river', 'amb_birds', 'amb_crowd', 'rain', 'rain_heavy',
         'rain_roof', 'wind', 'wind_trees', 'eng_idle', 'eng_low', 'eng_motor', 'eng_bus', 'eng_interior', 'ped_tick', 'siren_police', 'siren_amb', 'steps'}
SKIP = {'pigeons', 'tram_bell'}
os.makedirs(OUT, exist_ok=True)
def dur(f):
    r = subprocess.run([FF, '-i', f], capture_output=True, text=True).stderr
    h, m, s = r.split('Duration: ')[1].split(',')[0].split(':'); return int(h) * 3600 + int(m) * 60 + float(s)
total = 0
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.mp3') or f[:-4] in SKIP: continue
    n, src, dst = f[:-4], f'{SRC}/{f}', f'{OUT}/{f}'; d = dur(src)
    enc = ['-ac', '1', '-ar', '32000', '-b:a', '40k', '-y', dst]
    if n in LOOPS and d > 14:
        T, X = 12.0, 1.5
        fc = (f'[0]asplit[a][b];[a]atrim=0:{T},asetpts=PTS-STARTPTS,afade=t=in:st=0:d={X}[h];'
              f'[b]atrim={T}:{T + X},asetpts=PTS-STARTPTS,afade=t=out:st=0:d={X}[t];[h][t]amix=inputs=2:duration=first:normalize=0')
        cmd = [FF, '-loglevel', 'error', '-i', src, '-filter_complex', fc] + enc
    elif n not in LOOPS and d > 6:
        cmd = [FF, '-loglevel', 'error', '-i', src, '-af', 'atrim=0:6,afade=t=out:st=4.5:d=1.5'] + enc
    else:
        cmd = [FF, '-loglevel', 'error', '-i', src] + enc
    subprocess.run(cmd, check=True); total += os.path.getsize(dst)
cr = json.load(open(f'{SRC}/credits.json')); json.dump({k: v for k, v in cr.items() if k not in SKIP}, open(f'{OUT}/credits.json', 'w'), ensure_ascii=False)
print('snd', len(os.listdir(OUT)), round(total / 1048576, 2), 'MB')
