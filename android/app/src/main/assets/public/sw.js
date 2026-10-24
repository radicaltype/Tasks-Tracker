/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "index.html",
    "revision": "e0a2c61dc39e64f6e921d5c2d3131bea"
  }, {
    "url": "icon.svg",
    "revision": "97798a6a85d069869da522db92e1c358"
  }, {
    "url": "icon-maskable-512.png",
    "revision": "1e4272a361df7fc0b13a880c3572f79b"
  }, {
    "url": "icon-512.png",
    "revision": "e3686837ddadb1be47077c5db9cd506f"
  }, {
    "url": "icon-192.png",
    "revision": "fd52e779460bcc46ed825334a30a75fd"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "1cdc7fa8b967a41d41acfea5572cbe25"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/web-JeLi5ryv.js",
    "revision": null
  }, {
    "url": "assets/index-DnP45JXW.js",
    "revision": null
  }, {
    "url": "assets/index-CRUCdf_b.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "1cdc7fa8b967a41d41acfea5572cbe25"
  }, {
    "url": "icon-192.png",
    "revision": "fd52e779460bcc46ed825334a30a75fd"
  }, {
    "url": "icon-512.png",
    "revision": "e3686837ddadb1be47077c5db9cd506f"
  }, {
    "url": "icon-maskable-512.png",
    "revision": "1e4272a361df7fc0b13a880c3572f79b"
  }, {
    "url": "icon.svg",
    "revision": "97798a6a85d069869da522db92e1c358"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4b2089af91e30f437b9ebab94359fe60"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/__/]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
