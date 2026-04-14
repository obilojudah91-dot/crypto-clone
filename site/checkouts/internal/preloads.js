
    (function() {
      var cdnOrigin = "https://cdn.shopify.com";
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills-legacy.Cb9lHEF0.js","/cdn/shopifycloud/checkout-web/assets/c1/app-legacy.BNpfjA9c.js","/cdn/shopifycloud/checkout-web/assets/c1/vendor-legacy.D88vg0dT.js","/cdn/shopifycloud/checkout-web/assets/c1/browser-legacy.CpGiBTMs.js","/cdn/shopifycloud/checkout-web/assets/c1/FullScreenBackground-legacy.BWllJHsc.js","/cdn/shopifycloud/checkout-web/assets/c1/shop-discount-offer-legacy.DyvWZS5q.js","/cdn/shopifycloud/checkout-web/assets/c1/alternativePaymentCurrency-legacy.CXq92vgs.js","/cdn/shopifycloud/checkout-web/assets/c1/proposal-legacy.BD18t_L9.js","/cdn/shopifycloud/checkout-web/assets/c1/ButtonWithRegisterWebPixel-legacy.DgEMBDj5.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-en-legacy.DTcN8wGJ.js","/cdn/shopifycloud/checkout-web/assets/c1/page-OnePage-legacy.DVtMtuz2.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentButtons-legacy.2TfTlKlq.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalPickup-legacy.CTlGTtlf.js","/cdn/shopifycloud/checkout-web/assets/c1/NoAddressLocationFullDetour-legacy.76KyuV86.js","/cdn/shopifycloud/checkout-web/assets/c1/OffsitePaymentFailed-legacy.DMeGbrYE.js","/cdn/shopifycloud/checkout-web/assets/c1/useForceShopPayUrl-legacy.D3GgilbT.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayLogo-legacy.CIzlH_4E.js","/cdn/shopifycloud/checkout-web/assets/c1/VaultedPayment-legacy.9D4WzPQl.js","/cdn/shopifycloud/checkout-web/assets/c1/MarketsProDisclaimer-legacy.BdlmqVJB.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingGroupsSummary-legacy.Biuon0YB.js","/cdn/shopifycloud/checkout-web/assets/c1/StackedMerchandisePreview-legacy.CL-cE7dV.js","/cdn/shopifycloud/checkout-web/assets/c1/PickupPointCarrierLogo-legacy.C46GPuLn.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-legacy.BcID9XUn.js","/cdn/shopifycloud/checkout-web/assets/c1/AddDiscountButton-legacy.BDMq0ZbR.js","/cdn/shopifycloud/checkout-web/assets/c1/RememberMeDescriptionText-legacy.CDJNhB9s.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayOptInDisclaimer-legacy.CgyB_O8L.js","/cdn/shopifycloud/checkout-web/assets/c1/MobileOrderSummary-legacy.BbzjepF2.js","/cdn/shopifycloud/checkout-web/assets/c1/OrderEditVaultedDelivery-legacy.CwDOQWXD.js","/cdn/shopifycloud/checkout-web/assets/c1/SeparatePaymentsNotice-legacy.7_m3IdKP.js","/cdn/shopifycloud/checkout-web/assets/c1/useHasOrdersFromMultipleShops-legacy.CgK_X7oy.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblemsLineItemList-legacy.BYKYTrqZ.js","/cdn/shopifycloud/checkout-web/assets/c1/flags-legacy.Dqib8GC2.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown-legacy.DhFa-lZi.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal-legacy.B2EWifOd.js","/cdn/shopifycloud/checkout-web/assets/c1/shipping-options-legacy.DvkLXRXa.js","/cdn/shopifycloud/checkout-web/assets/c1/DutyOptions-legacy.CE5BXzV4.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingMethodSelector-legacy.CkAk8Ieb.js","/cdn/shopifycloud/checkout-web/assets/c1/SubscriptionPriceBreakdown-legacy.DjhOYHlC.js","/cdn/shopifycloud/checkout-web/assets/c1/component-RuntimeExtension-legacy.CnFI74rO.js","/cdn/shopifycloud/checkout-web/assets/c1/AnnouncementRuntimeExtensions-legacy.CynH0HcN.js","/cdn/shopifycloud/checkout-web/assets/c1/rendering-extension-targets-legacy.Cf2tUD7O.js","/cdn/shopifycloud/checkout-web/assets/c1/v4-legacy.On_frbc2.js","/cdn/shopifycloud/checkout-web/assets/c1/ExtensionsInner-legacy.CozPgIvA.js"];
      var styles = [];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0728/6600/5243/files/1200px-HD_transparent_picture_x320.png?v=1739054730","https://cdn.shopify.com/s/files/1/0728/6600/5243/files/checkout_banner_2_2000x.jpg?v=1738602478"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = [cdnOrigin].concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  