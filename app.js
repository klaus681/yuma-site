/* YUMA app.js
 * 1) Carica il core completo dal commit stabile e510633
 * 2) Poi carica regolamento-addon.js (sezione + admin + salvataggio)
 */
(function () {
  var core = document.createElement('script');
  core.src = 'https://cdn.jsdelivr.net/gh/klaus681/yuma-site@e510633a9f9bf0c7821e1ddf3368c2e18b06a18a/app.js';
  core.onload = function () {
    var addon = document.createElement('script');
    addon.src = 'regolamento-addon.js';
    addon.onerror = function () {
      console.error('YUMA: regolamento-addon.js non trovato');
    };
    document.head.appendChild(addon);
  };
  core.onerror = function () {
    console.error('YUMA: impossibile caricare app core dal CDN');
  };
  document.head.appendChild(core);
})();
