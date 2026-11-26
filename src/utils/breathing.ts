import Phaser from 'phaser';

export type BreathingTweens = [Phaser.Tweens.Tween, Phaser.Tweens.Tween];

export function startBreathing(target: Phaser.GameObjects.Container): BreathingTweens {
  const scaleTween = target.scene.tweens.add({
    targets: target,
    scaleX: 1.18,
    scaleY: 1.18,
    duration: 620,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  const bobTween = target.scene.tweens.add({
    targets: target,
    y: target.y - 6,
    duration: 480,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: 160,
  });
  return [scaleTween, bobTween];
}

export function stopBreathing(tweens: BreathingTweens | null, target: Phaser.GameObjects.Container): void {
  if (tweens) {
    tweens[0].stop();
    tweens[1].stop();
  }
  target.setScale(1);
}
