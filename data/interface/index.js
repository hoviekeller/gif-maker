var background = (function () {
  let tmp = {};
  let context = document.documentElement.getAttribute("context");
  if (context === "webapp") {
    return {
      "send": function () {},
      "receive": function (callback) {}
    }
  } else {
    chrome.runtime.onMessage.addListener(function (request) {
      for (let id in tmp) {
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
      "send": function (id, data) {
        chrome.runtime.sendMessage({
          "method": id, 
          "data": data,
          "path": "interface-to-background"
        }, function () {
          return chrome.runtime.lastError;
        });
      }
    }
  }
})();

var config = {
  "GIF": {
    "options": {}
  },
  "dragover": function (e) {
    e.preventDefault();
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "drop": function (e) {
    if (!e.target.id || e.target.id.indexOf("fileio") === -1) {
      e.preventDefault();
      /*  */
      config.handle.input.files({
        "target": {
          "files": e.dataTransfer.files
        }
      });
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          const current = await chrome.windows.getCurrent();
          /*  */
          config.update.container();
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "download": {
    "svg": function () {
      const result = document.querySelector(".result div");
      if (result) {
        const img = result.querySelector("img");
        if (img && img.src) {
          const a = document.createElement("a");
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
  "app": {
    "start": function () {
      const theme = config.storage.read("theme");
      const options = config.storage.read("options");
      const sidebar = document.querySelector(".sidebar");
      const items = [...sidebar.querySelectorAll("[id]")];
      /*  */
      config.GIF.options = options !== undefined ? options : {};
      document.documentElement.setAttribute("theme", theme !== undefined ? theme : "light");
      /*  */
      if (Object.keys(config.GIF.options).length === 0) config.handle.linsteners();
      for (let i = 0; i < items.length; i++) {
        items[i].addEventListener("change", config.handle.linsteners, false);
        /*  */
        const key = items[i].id;
        if (key in config.GIF.options) {
          items[i].value = config.GIF.options[key];
          config.update.svg(items[i].id, items[i].value);
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
          let tmp = {};
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
      const context = document.documentElement.getAttribute("context");
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
      const sidebar = document.querySelector(".sidebar");
      const items = [...sidebar.querySelectorAll("[id]")];
      /*  */
      for (let i = 0; i < items.length; i++) {
        const key = items[i].id;
        const value = items[i].type === "number" ? Number(items[i].value) : items[i].value;
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
            const key = "GIFSource";
            let source = config.GIF.options[key];
            const info = document.querySelector(".source").querySelector("div");
            /*  */
            info.textContent = e.target.files.length + " file(s) received.";
            if (e.target.files[0].type.indexOf("video") !== -1) source = "video";
            if (e.target.files[0].type.indexOf("image") !== -1) source = "images";
            /*  */
            config.GIF.options[source] = [];
            config.GIF.options[key] = source;
            document.querySelector("#" + key).value = source;
            config.storage.write("options", config.GIF.options);
            /*  */
            for (let i = 0; i < e.target.files.length; i++) {
              const file = e.target.files[i];
              if (file) {
                const src = window.URL.createObjectURL(file);
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
      const result = document.querySelector(".result");
      if (result) {
        const div = result.querySelector("div");
        if (div) {
          const svg = result.querySelector("svg");
          div.style.minHeight = svg.height.baseVal.value + 15 + "px";
        }
      }
    },
    "svg": function (id, value) {
      const result = document.querySelector(".result");
      if (result) {
        const div = result.querySelector("div");
        if (div) {
          const svg = div.querySelector("svg");
          if (svg) {
            const text = svg.querySelector("text");
            if (text) {
              switch (id) {
                case "fontColor": text.style.fill = value; break;
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
    const run = document.querySelector(".run");
    const theme = document.getElementById("theme");
    const reload = document.getElementById("reload");
    const fileio = document.getElementById("fileio");
    const support = document.getElementById("support");
    const download = document.querySelector(".download");
    const donation = document.getElementById("donation");
    /*  */
    download.addEventListener("click", config.download.svg, false);
    fileio.addEventListener("change", config.handle.input.files, false);
    reload.addEventListener("click", function () {document.location.reload()}, false);
    /*  */
    support.addEventListener("click", function () {
      const url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      const url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    theme.addEventListener("click", function () {
      let attribute = document.documentElement.getAttribute("theme");
      attribute = attribute === "dark" ? "light" : "dark";
      /*  */
      document.documentElement.setAttribute("theme", attribute);
      config.storage.write("theme", attribute);
    }, false);
    /*  */
    run.addEventListener("click", function () {
      const result = document.querySelector(".result div");
      const video = config.GIF.options.video && config.GIF.options.video.length;
      const images = config.GIF.options.images && config.GIF.options.images.length;
      /*  */
      result.textContent = "Loading, please wait...";
      window.setTimeout(function () {
        if (video || images) {
          if (navigator.userAgent.indexOf("Firefox") !== -1) {
            gifshot.utils.default.Blob = function (a, b) {
              const flag = b.type === "text/javascript";
              return flag ? "data:" + b.type + ";charset=utf-8;base64," + base64Encode(a) : new Blob(a, b);
            };
          }
          /*  */
          const cond_1 = config.GIF.options.GIFSource === "video";
          const cond_2 = config.GIF.options.GIFSource === "images" && config.GIF.options.images.length > 1;
          /*  */
          if (cond_1 || cond_2) {
            gifshot.createGIF(config.GIF.options, function (e) {
              if (e.error) result.textContent = e.error + '!';
              else {
                const img = document.createElement("img");
                img.src = e.image;
                result.textContent = '';
                result.appendChild(img);
              }
            });
          } else {
            result.textContent = "Error! Please select at least two image files and try again!";
          }
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

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("drop", config.drop, false);
window.addEventListener("dragover", config.dragover, false);
window.addEventListener("resize", config.resize.method, false);
