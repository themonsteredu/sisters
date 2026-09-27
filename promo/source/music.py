# 직접 합성한 배경음악 (저작권 걱정 없음) — 밝은 장조, 100BPM
import numpy as np, wave
SR=44100; DUR=55.0; N=int(SR*DUR); t=np.arange(N)/SR
BPM=100; beat=60/BPM; bar=beat*4
def mid(m): return 440*2**((m-69)/12)
# progression: C G Am F (2 bars each)
prog=[[60,64,67],[55,59,62],[57,60,64],[53,57,60]]
out=np.zeros(N); rng=np.random.default_rng(7)
def env_adsr(n,a,r):
    e=np.ones(n); ai=int(a*SR); ri=int(r*SR)
    e[:ai]=np.linspace(0,1,ai); e[-ri:]*=np.linspace(1,0,ri); return e
# warm pad
chord_len=bar*2; k=0; start=0.0
while start<DUR:
    ch=prog[k%4]; n=int(min(chord_len+1.0,DUR-start)*SR); s0=int(start*SR)
    tt=np.arange(n)/SR; sig=np.zeros(n)
    for m in ch+[ch[0]-12]:
        f=mid(m)
        for d in (-0.1,0.1):
            ff=f*2**(d/12)
            sig+=np.sin(2*np.pi*ff*tt)+0.22*np.sin(2*np.pi*2*ff*tt)+0.06*np.sin(2*np.pi*3*ff*tt)
    sig*=env_adsr(n,1.2,1.2)*0.032
    out[s0:s0+n]+=sig[:N-s0]; start+=chord_len; k+=1
# music-box pluck arpeggio (8ths) from 2.0s
step=beat/2; i=0; tcur=2.0
while tcur<DUR-2.5:
    ch=prog[int(tcur/chord_len)%4]
    pat=[0,1,2,1,2,0,2,1]; m=ch[pat[i%8]]+12+(12 if i%16>=12 else 0)
    n=int(0.7*SR); s0=int(tcur*SR); tt=np.arange(n)/SR; f=mid(m)
    sig=(np.sin(2*np.pi*f*tt)+0.35*np.sin(2*np.pi*3*f*tt)*np.exp(-tt*14))*np.exp(-tt*6)*0.055
    e=min(n,N-s0); out[s0:s0+e]+=sig[:e]; tcur+=step; i+=1
# soft kick + shaker + clap from 5.4s to 50.5s
tcur=5.4; bi=0
while tcur<50.5:
    n=int(0.3*SR); s0=int(tcur*SR); tt=np.arange(n)/SR
    f=55+80*np.exp(-tt*30); ph=2*np.pi*np.cumsum(f)/SR
    out[s0:s0+n]+=np.sin(ph)*np.exp(-tt*10)*0.17
    for off in (beat/2,):
        h0=int((tcur+off)*SR); hn=int(0.06*SR)
        if h0+hn<N: out[h0:h0+hn]+=rng.standard_normal(hn)*np.exp(-np.arange(hn)/SR*70)*0.018
    if bi%2==1:
        cn=int(0.12*SR)
        if s0+cn<N: out[s0:s0+cn]+=rng.standard_normal(cn)*np.exp(-np.arange(cn)/SR*35)*0.035
    tcur+=beat; bi+=1
# bass
for b in range(int(DUR/beat)):
    tb=b*beat
    if tb<5.4 or tb>50.5: continue
    ch=prog[int(tb/chord_len)%4]; f=mid(ch[0]-24)
    n=int(beat*SR*0.9); s0=int(tb*SR); tt=np.arange(n)/SR
    sig=np.sin(2*np.pi*f*tt)*np.minimum(1,tt*60)*np.exp(-tt*2.5)*0.11
    out[s0:s0+n]+=sig[:N-s0]
fade=np.ones(N); fi=int(1.0*SR); fade[:fi]=np.linspace(0,1,fi); fo=int(3.5*SR); fade[-fo:]=np.linspace(1,0,fo)**1.5
out*=fade
for d,g in ((0.21,0.22),(0.39,0.13),(0.61,0.07)):
    di=int(d*SR); out[di:]+=out[:-di]*g
out/=np.max(np.abs(out))*1.15
st=np.stack([out,np.roll(out,int(0.011*SR))],1)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
print('ok')
