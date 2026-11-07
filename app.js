/* YUMA app.js – core stabile + addon Regolamento */
(function () {
  var core = document.createElement('script');
  core.src = 'https://cdn.jsdelivr.net/gh/klaus681/yuma-site@e510633a9f9bf0c7821e1ddf3368c2e18b06a18a/app.js';
  core.onload = function () {
    var addon = document.createElement('script');
    addon.src = 'regolamento-addon.js';
    document.head.appendChild(addon);
  };
  core.onerror = function () {
    console.error('YUMA: errore caricamento app core');
  };
  document.head.appendChild(core);
})();
