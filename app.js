/* YUMA app.js
 * Sorgente completo dell'app (auth, admin, roster, ecc.) caricato dal commit stabile.
 * Le patch Regolamento sono in regolamento-addon.js
 */
(function () {
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/klaus681/yuma-site@e510633a9f9bf0c7821e1ddf3368c2e18b06a18a/app.js';
  s.onload = function () {
    var a = document.createElement('script');
    a.src = 'regolamento-addon.js';
    document.head.appendChild(a);
  };
  s.onerror = function () {
    console.error('YUMA: impossibile caricare app.js dal CDN');
  };
  document.head.appendChild(s);
})();
