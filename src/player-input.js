// Gameplay and held inputs follow the browser's actual mouse capture.
(() => {
  const canvas = J.renderer.domElement;
  const pause = Jt("pause");
  const resume = Jt("pauseResume");
  const settings = Jt("settings");
  const hint = pause.querySelector(".sub");
  const defaultHint = hint.textContent;
  const defaultAction = resume.textContent;
  const captureHint = "Mouse capture was blocked. If retry fails, open this HTML in its own tab.";
  hint.setAttribute("role", "status");
  const allowPause = () => Be.started && !Qm() && !T.dead && !T.won;
  const captured = () => document.pointerLockElement === canvas;
  const inSettings = () => !settings.classList.contains("hidden");

  function releaseHeldInput() {
    for (const key of Object.keys(li)) li[key] = false;
    Ct.firing = false;
    We.tabHeld = false;
  }

  function holdForCapture(focus) {
    if (!allowPause()) return;
    if (!Wk()) V5(true);
    // Pause Settings is part of the same pause. An asynchronous lock event
    // must keep that panel, its focus and the original game state intact.
    if (inSettings()) pause.classList.add("hidden");
    else if (focus) resume.focus({ preventScroll: true });
  }

  function captureDenied() {
    if (!allowPause() || captured()) return;
    hint.textContent = captureHint;
    hint.classList.add("capture-help");
    resume.textContent = "[ RETRY MOUSE CAPTURE ]";
    holdForCapture(true);
  }

  const request = canvas.requestPointerLock;
  canvas.requestPointerLock = function (...args) {
    if (!captured()) holdForCapture(false);
    if (request) return request.apply(this, args);
    captureDenied();
  };

  document.addEventListener("pointerlockerror", captureDenied);
  document.addEventListener("pointerlockchange", () => {
    if (!Be.started) return;
    releaseHeldInput();
    if (!captured()) {
      holdForCapture(true);
      return;
    }
    hint.textContent = defaultHint;
    hint.classList.remove("capture-help");
    resume.textContent = defaultAction;
    if (document.hidden || inSettings()) {
      holdForCapture(false);
      document.exitPointerLock();
    } else if (Qm() || T.dead || T.won) {
      document.exitPointerLock();
    }
  });

  function suspendInput() {
    if (!allowPause()) return;
    releaseHeldInput();
    holdForCapture(false);
    if (captured()) document.exitPointerLock();
  }

  // The combat module clears held inputs on ordinary window blur. Also pause
  // on focus loss here, even on browsers that retain capture until visibility
  // changes or do not emit a successful lock before that first loss.
  addEventListener("blur", suspendInput);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspendInput();
  });

  for (const name of ["interact", "startReload", "requestSwitch", "doKick"]) {
    const action = p0[name];
    p0[name] = (...args) => {
      if (!Wk()) return action(...args);
    };
  }

  addEventListener("keydown", event => {
    const mapKey = event.code === "Tab" || event.code === "KeyM";
    if (mapKey && (!Be.started || Wk() || Qm())) {
      // The native map listener cancels Tab. In menus, leave its browser
      // focus-navigation default available and don't open a hidden map.
      event.stopImmediatePropagation();
      return;
    }
    if (!Wk() || event.code === "Escape" || event.target.closest?.("#pause, #settings")) return;
    event.stopImmediatePropagation();
  }, true);

  function enableKeyboard(control) {
    control.setAttribute("role", "button");
    control.tabIndex = 0;
    control.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) control.click();
    });
  }

  const newGame = Jt("mNew");
  const chapter = Jt("mChapter");
  for (const control of [newGame, chapter, Jt("chapBack")]) enableKeyboard(control);
  if (document.activeElement === document.body) {
    (document.getElementById("mContinue") || newGame).focus({ preventScroll: true });
  }

  const showMenu = z1;
  z1 = function (id) {
    const wasChapter = !Jt("chapsel").classList.contains("hidden");
    const result = showMenu.apply(this, arguments);
    if (id === "chapsel") {
      const choices = Jt("chaplist").children;
      for (const choice of choices) {
        if (choice.classList.contains("locked")) {
          choice.setAttribute("aria-disabled", "true");
        } else {
          enableKeyboard(choice);
        }
      }
      [...choices].find(choice => choice.tabIndex === 0)?.focus();
    } else if (id === "intro" && wasChapter) {
      chapter.focus({ preventScroll: true });
    }
    return result;
  };

  const style = document.createElement("style");
  style.textContent = `
    :is(#intro, #chapsel, #pause) :focus-visible { outline: 2px solid #b8a26a; outline-offset: 4px; }
    #pause .capture-help { max-width: min(28rem, 90vw); color: #bda787; opacity: 1;
      font-size: clamp(12px, 2vw, 14px); line-height: 1.55; letter-spacing: .07em; text-transform: none; }
  `;
  document.head.append(style);
})();
