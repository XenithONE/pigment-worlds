// Original synthesized ambient sound: no recordings, network requests, or samples.
export class Soundscape {
  constructor(){this.context=null;this.enabled=false;this.voices=[];this.world=0;}
  async toggle(){
    if(!this.context){
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)throw new Error('このブラウザでは音声を再生できません。');
      this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
      const delay=this.context.createDelay(2);delay.delayTime.value=.48;const feedback=this.context.createGain();feedback.gain.value=.32;delay.connect(feedback);feedback.connect(delay);delay.connect(this.master);this.delay=delay;
      [0,1,2,3].forEach(i=>{const oscillator=this.context.createOscillator();oscillator.type='sine';const gain=this.context.createGain();gain.gain.value=.027/(1+i*.3);oscillator.connect(gain);gain.connect(this.master);gain.connect(delay);oscillator.start();this.voices.push(oscillator);});
      this.setWorld(this.world);
    }
    await this.context.resume();this.enabled=!this.enabled;this.master.gain.setTargetAtTime(this.enabled?.7:0,this.context.currentTime,.5);return this.enabled;
  }
  setWorld(id){this.world=id;if(!this.context)return;const chords=[[146.83,220,293.66,369.99],[174.61,261.63,349.23,440],[164.81,246.94,329.63,415.30],[130.81,196,261.63,329.63]];this.voices.forEach((v,i)=>v.frequency.setTargetAtTime(chords[id][i],this.context.currentTime,1.4));}
  chime(){if(!this.enabled||!this.context)return;const t=this.context.currentTime;[587.33,739.99,880].forEach((f,i)=>{const o=this.context.createOscillator(),g=this.context.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+i*.12+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.12+1.8);o.connect(g);g.connect(this.master);o.start(t+i*.12);o.stop(t+2);o.onended=()=>{o.disconnect();g.disconnect();};});}
  pause(){this.context?.suspend();}resume(){if(this.enabled)this.context?.resume().catch(()=>{});}
}
