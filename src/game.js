// ─── game.js ─────────────────────────────────────────────────────────────────
export const gameCanvas = document.createElement('canvas');
gameCanvas.width  = 600;
gameCanvas.height = 630;
const ctx = gameCanvas.getContext('2d');
const W = 600, H = 630;

// ─── 星背景 ───────────────────────────────────────────────────────────────────
const stars = Array.from({length: 120}, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: Math.random() * 1.5 + 0.3,
  speed: Math.random() * 1.2 + 0.3,
  a: Math.random() * 0.7 + 0.3,
}));
function drawStars(scroll) {
  for (const s of stars) {
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
    if (scroll) { s.y += s.speed; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } }
  }
}

// ─── 描画関数 ─────────────────────────────────────────────────────────────────
function drawPlayer(x, y, blink) {
  if (blink) return;
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(-18,20); ctx.lineTo(0,12); ctx.lineTo(18,20); ctx.closePath();
  ctx.fillStyle = '#4af'; ctx.fill(); ctx.strokeStyle = '#8df'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0,-4,5,9,0,0,Math.PI*2); ctx.fillStyle = '#aef'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10,20); ctx.lineTo(0,32+Math.random()*6); ctx.lineTo(10,20); ctx.closePath();
  ctx.fillStyle = `hsl(${30+Math.random()*30},100%,60%)`; ctx.fill();
  ctx.restore();
}
function drawEnemy(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0,26); ctx.lineTo(-22,-16); ctx.lineTo(22,-16); ctx.closePath();
  ctx.fillStyle = '#f64'; ctx.fill(); ctx.strokeStyle = '#fa8'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(-7,-2,4,0,Math.PI*2); ctx.fillStyle = '#ff0'; ctx.fill();
  ctx.beginPath(); ctx.arc(7,-2,4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawStrongEnemy(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  for (let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/6; i===0?ctx.moveTo(Math.cos(a)*26,Math.sin(a)*26):ctx.lineTo(Math.cos(a)*26,Math.sin(a)*26);}
  ctx.closePath(); ctx.fillStyle = '#a0f'; ctx.fill(); ctx.strokeStyle = '#d8f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fillStyle = '#ff0'; ctx.fill();
  ctx.restore();
}
function drawTrackerEnemy(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(18,0); ctx.lineTo(0,28); ctx.lineTo(-18,0); ctx.closePath();
  ctx.fillStyle = '#f0a'; ctx.fill(); ctx.strokeStyle = '#f8d'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
}
function drawBullet(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(3,0); ctx.lineTo(0,14); ctx.lineTo(-3,0); ctx.closePath();
  ctx.fillStyle = '#0ff'; ctx.shadowColor = '#0ff'; ctx.shadowBlur = 8; ctx.fill();
  ctx.restore();
}
function drawEnemyBullet(x, y, vx, vy) {
  const ang = Math.atan2(vy, vx);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI/2);
  ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(4,0); ctx.lineTo(0,10); ctx.lineTo(-4,0); ctx.closePath();
  ctx.fillStyle = '#f44'; ctx.shadowColor = '#f44'; ctx.shadowBlur = 6; ctx.fill();
  ctx.restore();
}
function drawHeart(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0,6);
  ctx.bezierCurveTo(-16,-6,-16,-20,0,-12); ctx.bezierCurveTo(16,-20,16,-6,0,6);
  ctx.fillStyle = '#f66'; ctx.shadowColor = '#f88'; ctx.shadowBlur = 6; ctx.fill();
  ctx.restore();
}
function drawExplosionParticles(ex) {
  const prog = ex.frame / 36;
  for (const p of ex.particles) {
    const alpha = Math.max(0, 1 - prog * 1.5);
    ctx.beginPath();
    ctx.arc(ex.x + p.dx*prog*ex.size*0.5, ex.y + p.dy*prog*ex.size*0.5, p.r*(1-prog), 0, Math.PI*2);
    ctx.fillStyle = `hsla(${p.hue},100%,60%,${alpha})`; ctx.fill();
  }
}
function drawLifeHeart(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.scale(0.7, 0.7);
  ctx.beginPath(); ctx.moveTo(0,8);
  ctx.bezierCurveTo(-20,-8,-20,-28,0,-16); ctx.bezierCurveTo(20,-28,20,-8,0,8);
  ctx.fillStyle = '#f44'; ctx.fill();
  ctx.restore();
}

// ─── ゲーム変数 ───────────────────────────────────────────────────────────────
const PLAYER_W = 60, PLAYER_SPEED = 5;
let playerX, playerY;
let isLeft = false, isRight = false, isFire = false, isEnter = false;
let shootTimer = 0;
const SHOOT_CD = 15;
let isGameOver = false, killCount = 0;
const killRankings = [0, 0, 0, 0, 0];
let life = 3;
let bullets = [], enemies = [], enemyBullets = [], heartDrops = [], explosions = [];
let playerExploded = false;
let invincible = false, invincibleTimer = 0;
const INV_DUR = 120, BLINK_INT = 5;
const DIFF_1 = 3600, DIFF_2 = 7200;
let gameTime = 0, frameCount = 0, gameOverSoundPlayed = false;

// ─── クラス ───────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x,y){this.x=x;this.y=y;this.speed=8;this.size=14;}
  update(){this.y-=this.speed;}
  isOffScreen(){return this.y<-20;}
  display(){drawBullet(this.x,this.y);}
}
class Enemy {
  constructor(x,y,type){
    this.x=x;this.y=y;this.baseX=x;this.type=type;
    this.angle=0;this.shootTimer=0;this.size=52;
    if(type===0){this.speedY=2;  this.shootInterval=90;}
    if(type===1){this.speedY=1.5;this.shootInterval=60;}
    if(type===2){this.speedY=1.8;this.shootInterval=100;}
  }
  update(){
    this.y+=this.speedY; this.angle+=0.05;
    if(this.type===0||this.type===1){this.x=this.baseX+Math.sin(this.angle)*20;}
    else{const dx=playerX-this.x;if(Math.abs(dx)>5)this.x+=dx*0.02;this.x=Math.max(this.size/2,Math.min(W-this.size/2,this.x));}
    this.shootTimer++;if(this.shootTimer>=this.shootInterval){this.shootTimer=0;this.shoot();}
  }
  display(){
    if(this.type===1) drawStrongEnemy(this.x,this.y);
    else if(this.type===2) drawTrackerEnemy(this.x,this.y);
    else drawEnemy(this.x,this.y);
  }
  isOffScreen(){return this.y>H+this.size;}
  shoot(){
    const bx=this.x,by=this.y+20;
    const dx=playerX-bx,dy=playerY-by;
    const ta=Math.atan2(dy,dx);
    if(dy<=0||Math.abs(ta-Math.PI/2)>=60*Math.PI/180) return;
    const add=a=>enemyBullets.push(new EnemyBullet(bx,by,Math.cos(a),Math.sin(a)));
    if(this.type===0||this.type===2){
      if(Math.random()<0.3){add(ta);add(ta-20*Math.PI/180);add(ta+20*Math.PI/180);}
      else if(this.type===0&&gameTime>=DIFF_1){add(ta-15*Math.PI/180);add(ta);add(ta+15*Math.PI/180);}
      else add(ta);
    } else if(this.type===1){
      for(let i=0;i<8;i++) add((i/8)*Math.PI*2);
    }
  }
}
class EnemyBullet {
  constructor(x,y,vx,vy){
    this.x=x;this.y=y;this.speed=4.8;this.size=14;
    const m=Math.hypot(vx,vy);
    this.vx=m?(vx/m)*this.speed:0;this.vy=m?(vy/m)*this.speed:this.speed;
  }
  update(){this.x+=this.vx;this.y+=this.vy;}
  isOffScreen(){return this.x<-20||this.x>W+20||this.y<-20||this.y>H+20;}
  display(){drawEnemyBullet(this.x,this.y,this.vx,this.vy);}
}
class Explosion {
  constructor(x,y,size){
    this.x=x;this.y=y;this.size=size;this.frame=0;
    this.particles=Array.from({length:18},()=>({
      dx:(Math.random()-0.5)*2,dy:(Math.random()-0.5)*2,
      r:Math.random()*5+2,hue:Math.random()*60+10,
    }));
  }
  done(){return this.frame>=36;}
  update(){this.frame++;}
  display(){drawExplosionParticles(this);}
}
class HeartDrop {
  constructor(x,y){this.x=x;this.y=y;this.size=36;this.speed=2;}
  update(){this.y+=this.speed;}
  isOffScreen(){return this.y>H+40;}
  display(){drawHeart(this.x,this.y);}
}

// ─── ランキング / リセット ────────────────────────────────────────────────────
function updateRanking(score) {
  for(let i=0;i<killRankings.length;i++){
    if(score>killRankings[i]){
      for(let j=killRankings.length-1;j>i;j--) killRankings[j]=killRankings[j-1];
      killRankings[i]=score; break;
    }
  }
}
function resetGame() {
  if(isGameOver) updateRanking(killCount);
  playerX=W/2; playerY=H-100;
  isGameOver=false; killCount=0; life=3; gameTime=0; frameCount=0;
  bullets=[]; enemies=[]; enemyBullets=[]; heartDrops=[]; explosions=[];
  playerExploded=false; invincible=false; invincibleTimer=0;
  isLeft=false; isRight=false; isFire=false; isEnter=false;
  shootTimer=0; gameOverSoundPlayed=false;
}

// ─── 入力（スペースのみ・Z削除） ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!_gameActive) return;
  if(e.key==='a'||e.key==='A') isLeft=true;
  if(e.key==='d'||e.key==='D') isRight=true;
  if(e.key===' '){isFire=true; e.preventDefault();}
  if(e.key==='Enter') isEnter=true;
});
document.addEventListener('keyup', e => {
  if(e.key==='a'||e.key==='A') isLeft=false;
  if(e.key==='d'||e.key==='D') isRight=false;
  if(e.key===' ') isFire=false;
  if(e.key==='Enter') isEnter=false;
});

// ─── ゲームループ (1フレーム描画) ─────────────────────────────────────────────
function drawFrame() {
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  drawStars(true);

  if (!isGameOver) {
    gameTime++; frameCount++;
    if(isLeft)  playerX -= PLAYER_SPEED;
    if(isRight) playerX += PLAYER_SPEED;
    playerX = Math.max(PLAYER_W/2, Math.min(W-PLAYER_W/2, playerX));

    shootTimer++;
    if(isFire && shootTimer >= SHOOT_CD){
      bullets.push(new Bullet(playerX, playerY-30));
      shootTimer = 0;
    }

    const curInvDur = gameTime >= DIFF_2 ? 60 : INV_DUR;
    if(invincible){invincibleTimer++;if(invincibleTimer>=curInvDur){invincible=false;invincibleTimer=0;}}

    let sp=75;if(killCount>=50)sp=15;else if(killCount>=25)sp=30;else if(killCount>=10)sp=45;
    if(frameCount%sp===0) enemies.push(new Enemy(PLAYER_W/2+Math.random()*(W-PLAYER_W),-60,0));
    if(killCount>=15&&frameCount%150===0) enemies.push(new Enemy(PLAYER_W/2+Math.random()*(W-PLAYER_W),-60,1));
    if(killCount>=30&&frameCount%225===0) enemies.push(new Enemy(PLAYER_W/2+Math.random()*(W-PLAYER_W),-60,2));
  } else {
    if(!gameOverSoundPlayed){gameOverSoundPlayed=true;}
    ctx.textAlign='center'; ctx.shadowBlur=0;
    ctx.fillStyle='#f33'; ctx.font='bold 52px sans-serif'; ctx.fillText('GAME OVER',W/2,H/2);
    ctx.fillStyle='#fff'; ctx.font='24px sans-serif'; ctx.fillText('Press ENTER to Restart',W/2,H/2+50);
    ctx.font='22px sans-serif'; ctx.fillText('Kill: '+killCount,W/2,H/2+82);
    ctx.font='18px sans-serif'; ctx.fillText('Time: '+Math.floor(gameTime/60)+'s',W/2,H/2+112);
    ctx.fillStyle='#aaa'; ctx.font='16px sans-serif'; ctx.fillText('ESC: タイトルへ戻る',W/2,H/2+148);
    if(isEnter) resetGame();
  }

  for(let i=explosions.length-1;i>=0;i--){
    explosions[i].update();explosions[i].display();
    if(explosions[i].done()) explosions.splice(i,1);
  }

  if(!isGameOver){
    const blink=invincible&&Math.floor(frameCount/BLINK_INT)%2===1;
    drawPlayer(playerX,playerY,blink);
  }

  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.update();b.display();
    let removed=false;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      if(Math.hypot(b.x-e.x,b.y-e.y)<b.size/2+e.size/2){
        enemies.splice(j,1);bullets.splice(i,1);removed=true;killCount++;
        explosions.push(new Explosion(e.x,e.y,80));
        if(Math.random()<0.3) heartDrops.push(new HeartDrop(e.x,e.y));
        break;
      }
    }
    if(!removed&&b.isOffScreen()) bullets.splice(i,1);
  }
  outer:
  for(let i=bullets.length-1;i>=0;i--){
    for(let j=enemyBullets.length-1;j>=0;j--){
      if(Math.hypot(bullets[i].x-enemyBullets[j].x,bullets[i].y-enemyBullets[j].y)<(bullets[i].size+enemyBullets[j].size)/2){
        bullets.splice(i,1);enemyBullets.splice(j,1);continue outer;
      }
    }
  }
  const dmg=gameTime>=DIFF_2?2:1;
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];e.update();e.display();
    if(!isGameOver&&!invincible&&Math.hypot(e.x-playerX,e.y-playerY)<e.size/2+PLAYER_W/2*0.7){
      enemies.splice(i,1);life-=dmg;invincible=true;invincibleTimer=0;
      if(life<=0&&!playerExploded){isGameOver=true;explosions.push(new Explosion(playerX,playerY,100));playerExploded=true;}
      continue;
    }
    if(e.isOffScreen()) enemies.splice(i,1);
  }
  for(let i=enemyBullets.length-1;i>=0;i--){
    const eb=enemyBullets[i];eb.update();eb.display();
    if(!isGameOver&&!invincible&&Math.hypot(eb.x-playerX,eb.y-playerY)<eb.size/2+PLAYER_W/2*0.6){
      enemyBullets.splice(i,1);life-=dmg;invincible=true;invincibleTimer=0;
      if(life<=0&&!playerExploded){isGameOver=true;explosions.push(new Explosion(playerX,playerY,100));playerExploded=true;}
      continue;
    }
    if(i<enemyBullets.length&&enemyBullets[i].isOffScreen()) enemyBullets.splice(i,1);
  }
  for(let i=heartDrops.length-1;i>=0;i--){
    const hd=heartDrops[i];hd.update();hd.display();
    if(Math.hypot(hd.x-playerX,hd.y-playerY)<hd.size/2+PLAYER_W/2*0.6){
      life++;heartDrops.splice(i,1);
    } else if(hd.isOffScreen()) heartDrops.splice(i,1);
  }

  ctx.shadowBlur=0;
  for(let i=0;i<life;i++) drawLifeHeart(18+i*34,38);
  ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='16px sans-serif';
  ctx.fillText('Kill: '+killCount,10,H-10);
  ctx.textAlign='right';ctx.fillStyle='#f88';ctx.font='bold 15px sans-serif';ctx.fillText('Kill Ranking',W-10,22);
  ctx.fillStyle='#fcc';ctx.font='14px sans-serif';
  const sx=['st','nd','rd','th','th'];
  for(let i=0;i<killRankings.length;i++) ctx.fillText(`${i+1}${sx[i]}: ${killRankings[i]}`,W-10,42+i*18);
}

// ─── アイドル画面 ─────────────────────────────────────────────────────────────
function drawIdle() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  drawStars(true);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4af';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(' 宇宙防衛戦', W/2, H/2 - 40);
  ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4*Math.sin(Date.now()*0.003)})`;
  ctx.font = '20px sans-serif';
  ctx.fillText('スペースで開始', W/2, H/2 + 10);
  ctx.fillStyle = '#555';
  ctx.font = '14px sans-serif';
  ctx.fillText('A/D: 移動　スペース: 射撃　ESC: カメラ戻す', W/2, H/2 + 50);
}

// ─── ループ管理 ───────────────────────────────────────────────────────────────
let _gameActive = false;
let _animId = null;

function idleLoop() {
  if (_gameActive) return;
  drawIdle();
  _animId = requestAnimationFrame(idleLoop);
}

function gameLoop() {
  if (!_gameActive) return;
  drawFrame();
  _animId = requestAnimationFrame(gameLoop);
}

// ─── 公開API ──────────────────────────────────────────────────────────────────
export const isGameActive = () => _gameActive;

export function startGame() {
  if (_gameActive) return;
  _gameActive = true;
  if (_animId) cancelAnimationFrame(_animId);
  resetGame();
  _animId = requestAnimationFrame(gameLoop);
}

// ゲームを止めてアイドルに戻る（ESC 1回目用）
export function stopGame() {
  if (!_gameActive) return;
  updateRanking(killCount);
  _gameActive = false;
  if (_animId) cancelAnimationFrame(_animId);
  _animId = requestAnimationFrame(idleLoop);
}

// モジュール読み込み時にアイドル画面を開始
_animId = requestAnimationFrame(idleLoop);