import { Howl, Howler } from 'howler';

globalThis.HowlerGlobal = Howler;

import notificationSound from '../../images/notificationsound.mp3';

export const useSound = () => {
  const playSound = () => {
    const sound = new Howl({
      src: [notificationSound],
      html5: true, 
      onplayerror: function () {
        sound.once('unlock', function () {
          sound.play();
        });
      }
    });

    sound.play();
  };

  return playSound; 
};

export default useSound;
