var background = (function () {
  var tmp = {};
  var context = document.documentElement.getAttribute("context");
  if (context === "webapp") {
    return {
      "send": function () {},
      "receive": function (callback) {}
    }
  } else {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      for (var id in tmp) {
        if (tmp[id] && (typeof tmp[id] === "function")) {
          if (request.path === "background-to-interface") {
            if (request.method === id) tmp[id](request.data);
          }
        }
      }
    });
    /*  */
    return {
      "receive": function (id, callback) {tmp[id] = callback},
      "send": function (id, data) {chrome.runtime.sendMessage({"path": "interface-to-background", "method": id, "data": data})}
    }
  }
})();

var config = {
  "GIF": {"options": {}},
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
      config.resize.timeout = window.setTimeout(function () {
        config.update.container();
        /*  */
        config.storage.write("size", {
          "width": window.innerWidth || window.outerWidth,
          "height": window.innerHeight || window.outerHeight
        });
      }, 1000);
    }
  },
  "app": {
    "start": function () {
      var sidebar = document.querySelector(".sidebar");
      var items = [...sidebar.querySelectorAll("[id]")];
      config.GIF.options = config.storage.read("options") !== undefined ? config.storage.read("options") : {};
      /*  */
      if (Object.keys(config.GIF.options).length === 0) config.handle.linsteners();
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener("change", config.handle.linsteners, false);
        /*  */
        var key = items[i].id;
        if (key in config.GIF.options) {
          items[i].value = config.GIF.options[key];
          config.update.svg(items[i].id, items[i].value);
        }
      }
    }
  },
  "download": {
    "svg": function (href, filename) {
      var result = document.querySelector(".result div");
      if (result) {
        var img = result.querySelector("img");
        if (img && img.src) {
          var a = document.createElement("a");
          a.href = img.src;
          a.download = "result.gif";
          document.body.appendChild(a);
          /*  */
          window.setTimeout(function () {a.click()}, 100);
          window.setTimeout(function () {a.remove()}, 300);
        } else {
          result.textContent = "An unexpected error occurred! No GIF file to download!";
        }
      }
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.body.style.width = "700px";
              document.body.style.height = "500px";
            }
            /*  */
            chrome.runtime.connect({
              "name": config.port.name
            });
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "handle": {
    "linsteners": function (e) {
      var sidebar = document.querySelector(".sidebar");
      var items = [...sidebar.querySelectorAll("[id]")];
      /*  */
      for (var i = 0; i < items.length; i++) {
        var key = items[i].id;
        var value = items[i].type === "number" ? Number(items[i].value) : items[i].value;
        if (key !== undefined && value !== undefined) {
          config.GIF.options[key] = value;
        }
      }
      /*  */
      config.storage.write("options", config.GIF.options);
      if (e) config.update.svg(e.target.id, e.target.value);
    },
    "input": {
      "files": function (e) {
        if (e.target && e.target.files) {
          if (e.target.files.length && e.target.files[0]) {
            delete config.GIF.options.video;
            delete config.GIF.options.images;
            delete config.GIF.options.undefined;
            /*  */
            var key = "GIFSource";
            var source = config.GIF.options[key];
            if (e.target.files[0].type.indexOf("video") !== -1) source = "video";
            if (e.target.files[0].type.indexOf("image") !== -1) source = "images";
            /*  */
            config.GIF.options[source] = [];
            config.GIF.options[key] = source;
            document.querySelector("#" + key).value = source;
            config.storage.write("options", config.GIF.options);
            /*  */
            for (var i = 0; i < e.target.files.length; i++) {
              var file = e.target.files[i];
              if (file) {
                var src = window.URL.createObjectURL(file);
                if (src) {
                  config.GIF.options[source].push(src);
                }
              }
            }
          }
        }
      }
    }
  },
  "update": {
    "container": function () {
      var result = document.querySelector(".result");
      if (result) {
        var div = result.querySelector("div");
        if (div) {
          div.style.height = "max-content";
          div.style.height = window.getComputedStyle(result).height;
        }
      }
    },
    "svg": function (id, value) {
      var result = document.querySelector(".result");
      if (result) {
        var div = result.querySelector("div");
        if (div) {
          var svg = div.querySelector("svg");
          if (svg) {
            var text = svg.querySelector("text");
            if (text) {
              switch (id) {
                case "fontColor": text.style.color = value; break;
                case "textAlign": text.style.textAlign = value; break;
                case "fontWeight": text.style.fontWeight = value; break;
                case "fontFamily": text.style.fontFamily = value; break;
                case "fontSize": text.style.fontSize = value + "px"; break;
                case "gifWidth":
                  var w = document.getElementById("gifWidth").value;
                  var h = document.getElementById("gifHeight").value;
                  /*  */
                  svg.style.width = value + "px";
                  text.textContent = w + " ✕ " + h;
                  svg.setAttribute("width", value);
                  /*  */
                  config.update.container();
                  break;
                case "gifHeight":
                  var w = document.getElementById("gifWidth").value;
                  var h = document.getElementById("gifHeight").value;
                  /*  */
                  svg.style.height = value + "px";
                  text.textContent = w + " ✕ " + h;
                  svg.setAttribute("height", value);
                  /*  */
                  config.update.container();
                  break;
                default:
              }
            }
          }
        }
      }
    }
  },
  "load": function () {
    var run = document.querySelector(".run");
    var reload = document.getElementById("reload");
    var fileio = document.getElementById("fileio");
    var support = document.getElementById("support");
    var download = document.querySelector(".download");
    var donation = document.getElementById("donation");
    /*  */
    download.addEventListener("click", config.download.svg, false);
    fileio.addEventListener("change", config.handle.input.files, false);
    reload.addEventListener("click", function () {document.location.reload()}, false);
    /*  */
    support.addEventListener("click", function () {
      var url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      var url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    run.addEventListener("click", function () {
      var result = document.querySelector(".result div");
      var video = config.GIF.options.video && config.GIF.options.video.length;
      var images = config.GIF.options.images && config.GIF.options.images.length;
      /*  */
      result.textContent = "Loading, please wait...";
      window.setTimeout(function () {
        if (video || images) {
          if (navigator.userAgent.indexOf("Firefox") !== -1) {
            gifshot.utils.default.Blob = function (a, b) {
              var flag = b.type === "text/javascript";
              return flag ? "data:" + b.type + ";charset=utf-8;base64," + base64Encode(a) : new Blob(a, b);
            };
          }
          /*  */
          gifshot.createGIF(config.GIF.options, function (e) {
            if (e.error) result.textContent = e.error + '!';
            else {
              var img = document.createElement("img");
              img.src = e.image;
              result.textContent = '';
              result.appendChild(img);
            }
          });
        } else {
          result.textContent = "An unexpected error occurred! No image or video file is selected!";
        }
      }, 300);
    }, false);
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  }
};

window.addEventListener("drop", function (e) {
  if (!e.target.id || e.target.id.indexOf("fileio") === -1) {
    e.preventDefault();
  }
});

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
window.addEventListener("dragover", function (e) {e.preventDefault()});