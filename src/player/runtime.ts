import { INPUT_FONT_SIZE_DEFAULT } from "../contract/text-style";
import { validateTextInput } from "../contract/text-validation";
import type {
  Action,
  CheckboxAction,
  ClickAction,
  InputAction,
  InformativeAction,
  Project,
  Rect,
} from "../contract/project";
import type { Scorm12Adapter } from "../scorm/scorm12-adapter";
import { applyRect, fitImageToViewport } from "./image-layout";

type PlayerDom = {
  root: HTMLElement;
  title: HTMLHeadingElement;
  stepCount: HTMLParagraphElement;
  progress: HTMLProgressElement;
  instruction: HTMLParagraphElement;
  viewport: HTMLDivElement;
  stage: HTMLDivElement;
  image: HTMLImageElement;
  hotspots: HTMLDivElement;
  inputsLayer: HTMLDivElement;
  fullscreenButton: HTMLButtonElement;
  feedback: HTMLParagraphElement;
  alert: HTMLParagraphElement;
  resolutionWarning: HTMLParagraphElement;
  actionArea: HTMLDivElement;
};

export type PlayerRuntimeOptions = {
  project: Project;
  resolveAssetUrl: (asset: Project["assets"][number]) => string;
  lms?: Scorm12Adapter | null;
  initialStepIndex?: number;
};

export type PlayerRuntimeHandle = {
  unmount: () => void;
};

const text = (element: HTMLElement, value: string): void => {
  element.textContent = value;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  name: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(name);
  if (className) element.className = className;
  return element;
}

function createPlayerDom(root: HTMLElement): PlayerDom {
  const header = createElement("header", "player-header");
  const title = createElement("h1");
  title.id = "step-title";
  const progressInfo = createElement("div", "progress-info");
  const stepCount = createElement("p");
  const progress = createElement("progress");
  progress.max = 1;
  progress.setAttribute("aria-label", "Progreso de la simulación");
  progressInfo.append(stepCount, progress);
  const fullscreenButton = createElement("button", "fullscreen-button");
  fullscreenButton.type = "button";
  text(fullscreenButton, "Pantalla completa");
  const headerActions = createElement("div", "player-header-actions");
  headerActions.append(fullscreenButton, progressInfo);
  header.append(title, headerActions);

  const content = createElement("main", "player-content");
  const simulation = createElement("section", "simulation-card");
  const instruction = createElement("p", "instruction");
  instruction.id = "instruction";
  const resolutionWarning = createElement("p", "resolution-warning");
  resolutionWarning.id = "resolution-warning";
  resolutionWarning.setAttribute("role", "status");
  resolutionWarning.setAttribute("aria-live", "polite");
  const viewport = createElement("div", "image-viewport");
  viewport.dataset.testid = "image-viewport";
  const stage = createElement("div", "image-stage");
  const image = createElement("img", "player-image");
  image.alt = "";
  const hotspots = createElement("div", "hotspots");
  hotspots.setAttribute("aria-label", "Zonas de interacción");
  const inputsLayer = createElement("div", "inputs-layer");
  inputsLayer.setAttribute("role", "group");
  inputsLayer.setAttribute("aria-label", "Formulario de la simulación");
  stage.append(image, hotspots, inputsLayer);
  viewport.append(stage);
  const feedback = createElement("p", "feedback");
  feedback.id = "feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  const alert = createElement("p", "feedback-error");
  alert.id = "error";
  alert.setAttribute("role", "alert");
  alert.setAttribute("aria-live", "assertive");
  alert.hidden = true;
  const actionArea = createElement("div", "action-area");
  simulation.append(
    instruction,
    resolutionWarning,
    viewport,
    feedback,
    alert,
    actionArea,
  );
  content.append(simulation);
  root.replaceChildren(header, content);

  return {
    root,
    title,
    stepCount,
    progress,
    instruction,
    viewport,
    stage,
    image,
    hotspots,
    inputsLayer,
    fullscreenButton,
    feedback,
    alert,
    resolutionWarning,
    actionArea,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo abrir esta simulación.";
}

function validationMessage(
  reason: "empty" | "format" | "incorrect",
  action: InputAction,
  stepError?: string,
): string {
  if (action.messages?.error) return action.messages.error;
  if (reason === "empty") return "Completa este campo.";
  if (reason === "format") return "Revisa el formato ingresado.";
  if (action.validation.kind === "rut") {
    return "El RUT no es válido; revisa el dígito verificador.";
  }
  if (stepError) return stepError;
  return "El valor ingresado no es correcto.";
}

export function createPlayerRuntime(
  root: HTMLElement,
  options: PlayerRuntimeOptions,
): PlayerRuntimeHandle {
  const { project, resolveAssetUrl, lms = null } = options;
  const dom = createPlayerDom(root);
  const initialIndex = Math.min(
    Math.max(options.initialStepIndex ?? 0, 0),
    Math.max(project.steps.length - 1, 0),
  );
  let stepIndex = initialIndex;
  let actionIndex = 0;
  let imageReady = false;
  let transitionLocked = false;
  let clickedTargets = new Set<number>();
  let unmounted = false;

  if (lms) {
    window.addEventListener("beforeunload", lms.finish);
  }

  const setAlert = (message: string) => {
    text(dom.alert, message);
    dom.alert.hidden = message.length === 0;
  };

  const updateResolutionWarning = () => {
    const tooSmall = window.innerWidth < 1024 || window.innerHeight < 600;
    text(
      dom.resolutionWarning,
      tooSmall ? "Para una mejor experiencia, amplía la ventana a 1024×600 o más." : "",
    );
    dom.resolutionWarning.hidden = !tooSmall;
  };

  const updateFullscreenLabel = () => {
    text(
      dom.fullscreenButton,
      document.fullscreenElement ? "Salir de pantalla completa" : "Pantalla completa",
    );
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (dom.root.requestFullscreen) {
        await dom.root.requestFullscreen();
      } else {
        throw new Error("La API de pantalla completa no está disponible.");
      }
    } catch {
      setAlert(
        "El navegador o el LMS no permitió la pantalla completa. Amplía la ventana del curso.",
      );
    }
  };

  const onFullscreenChange = () => updateFullscreenLabel();
  dom.fullscreenButton.addEventListener("click", () => void toggleFullscreen());
  document.addEventListener("fullscreenchange", onFullscreenChange);

  const currentStep = () => project.steps[stepIndex];
  const currentAction = (): Action => currentStep().actions[actionIndex];

  const successMessage = (action?: InputAction): string =>
    action?.messages?.success ?? currentStep().messages?.success ?? "¡Correcto!";

  const stepErrorMessage = (): string | undefined => currentStep().messages?.error;

  const clearInteraction = () => {
    dom.hotspots.replaceChildren();
    dom.inputsLayer.replaceChildren();
    dom.actionArea.replaceChildren();
    text(dom.feedback, "");
    setAlert("");
  };

  const setRectStyle = (element: HTMLElement, rect: Rect) => {
    applyRect(element, rect);
  };

  const advance = (preservedFeedback?: string) => {
    if (transitionLocked) return;
    transitionLocked = true;
    queueMicrotask(() => {
      transitionLocked = false;
    });
    const step = currentStep();
    if (actionIndex + 1 < step.actions.length) {
      actionIndex += 1;
      clickedTargets = new Set<number>();
      renderAction(preservedFeedback);
      return;
    }
    if (stepIndex + 1 < project.steps.length) {
      try {
        lms?.setLessonLocation(project.steps[stepIndex + 1].id);
      } catch (error) {
        setAlert(`No se pudo comunicar el progreso al LMS: ${errorMessage(error)}`);
        renderAction();
        return;
      }
      stepIndex += 1;
      actionIndex = 0;
      clickedTargets = new Set<number>();
      renderStep(preservedFeedback);
      return;
    }
    try {
      lms?.complete();
      showCompletion(preservedFeedback);
    } catch (error) {
      setAlert(`No se pudo informar la finalización al LMS: ${errorMessage(error)}`);
      renderAction();
    }
  };

  const renderClickAction = (
    action: ClickAction,
    options?: { formMode?: boolean; onActivate?: () => void },
  ) => {
    action.rects.forEach((rect, index) => {
      const hotspot = createElement(
        "button",
        options?.formMode ? "hotspot form-submit" : "hotspot",
      );
      hotspot.type = "button";
      hotspot.dataset.testid = "hotspot";
      hotspot.setAttribute("aria-label", `Zona de interacción ${index + 1}`);
      hotspot.title = `Zona de interacción ${index + 1}`;
      setRectStyle(hotspot, rect);
      hotspot.addEventListener("click", () => {
        if (transitionLocked) return;
        if (options?.onActivate) {
          options.onActivate();
          return;
        }
        clickedTargets.add(index);
        if (action.match === "all" && clickedTargets.size < action.rects.length) {
          text(dom.feedback, "Bien. Completa las demás zonas indicadas.");
          return;
        }
        const message = successMessage();
        text(dom.feedback, message);
        advance(message);
      });
      dom.hotspots.append(hotspot);
    });
  };

  const renderInputAction = (action: InputAction) => {
    const highlight = createElement("div", "hotspot input-hotspot");
    highlight.setAttribute("aria-hidden", "true");
    setRectStyle(highlight, action.rect);
    dom.hotspots.append(highlight);

    const form = createElement("form", "input-form");
    const label = createElement("label");
    const input = createElement("input");
    const id = `input-${action.id}`;
    label.htmlFor = id;
    text(label, action.label);
    input.id = id;
    input.name = `simulated-${action.id}`;
    input.type = action.masked ? "password" : "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = action.placeholder ?? "";
    const button = createElement("button", "primary-button");
    button.type = "submit";
    text(button, "Validar y continuar");
    form.append(label, input, button);

    const validate = () => {
      setAlert("");
      const result = validateTextInput(input.value, action.validation);
      if (!result.valid) {
        setAlert(validationMessage(result.reason, action, currentStep().messages?.error));
        input.focus();
        return;
      }
      const message = successMessage(action);
      input.value = "";
      text(dom.feedback, message);
      advance(message);
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      validate();
    });
    input.addEventListener("blur", () => {
      if (!input.value) return;
      const result = validateTextInput(input.value, action.validation);
      if (!result.valid) {
        setAlert(validationMessage(result.reason, action, currentStep().messages?.error));
      }
    });
    dom.actionArea.append(form);
  };

  const renderForm = (inputs: InputAction[], clickIndex: number, click: ClickAction) => {
    const asset = project.assets.find((item) => item.id === currentStep().assetId);
    const fields: Array<{ action: InputAction; input: HTMLInputElement }> = [];

    for (const action of inputs) {
      const wrapper = createElement("div", "overlay-field");
      setRectStyle(wrapper, action.rect);
      if (asset) {
        const fontPercent = action.fontSize ?? INPUT_FONT_SIZE_DEFAULT;
        wrapper.style.fontSize = `${Math.max(
          9,
          Math.round(asset.height * action.rect.h * (fontPercent / 100)),
        )}px`;
      }
      const input = createElement("input", "overlay-input");
      input.type = action.masked ? "password" : "text";
      input.name = `simulated-${action.id}`;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = action.placeholder ?? "";
      input.setAttribute("aria-label", action.label);
      input.dataset.testid = `overlay-input-${action.id}`;
      input.addEventListener("input", () => {
        input.classList.remove("invalid");
        input.removeAttribute("aria-invalid");
        setAlert("");
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        submit();
      });
      const helpText = action.placeholder?.trim() || action.label;
      const tooltip = createElement("span", "field-tooltip");
      tooltip.id = `help-${action.id}`;
      tooltip.setAttribute("role", "tooltip");
      text(tooltip, helpText);
      if (action.rect.y < 0.18) wrapper.classList.add("tooltip-below");
      input.setAttribute("aria-describedby", tooltip.id);
      wrapper.append(input, tooltip);
      dom.inputsLayer.append(wrapper);
      fields.push({ action, input });
    }

    function submit(): void {
      let firstInvalid: { action: InputAction; input: HTMLInputElement } | null = null;
      let firstReason: "empty" | "format" | "incorrect" = "empty";

      for (const field of fields) {
        const result = validateTextInput(field.input.value, field.action.validation);
        field.input.classList.toggle("invalid", !result.valid);
        if (!result.valid) {
          field.input.setAttribute("aria-invalid", "true");
          if (!firstInvalid) {
            firstInvalid = field;
            firstReason = result.reason;
          }
        } else {
          field.input.removeAttribute("aria-invalid");
        }
      }

      if (firstInvalid) {
        setAlert(
          validationMessage(firstReason, firstInvalid.action, currentStep().messages?.error),
        );
        firstInvalid.input.focus();
        return;
      }

      setAlert("");
      const message = successMessage();
      text(dom.feedback, message);
      actionIndex = clickIndex;
      advance(message);
    }

    renderClickAction(click, { formMode: true, onActivate: submit });
    window.requestAnimationFrame(() => fields[0]?.input.focus());
  };

  const renderCheckboxGroup = (
    action: CheckboxAction,
    click: ClickAction | null,
    clickIndex: number,
  ) => {
    const asset = project.assets.find((item) => item.id === currentStep().assetId);
    const fields = action.items.map((item, index) => {
      const wrapper = createElement("label", "checkbox-overlay");
      setRectStyle(wrapper, item.rect);
      wrapper.dataset.testid = "overlay-checkbox";
      if (asset) {
        wrapper.style.fontSize = `${Math.max(
          10,
          Math.round(asset.height * item.rect.h * 0.6),
        )}px`;
      }
      const input = createElement("input", "checkbox-input");
      input.type = "checkbox";
      input.setAttribute("aria-label", item.label ?? `Casilla ${index + 1}`);
      input.dataset.testid = `overlay-checkbox-${item.id}`;
      const visual = createElement("span", "checkbox-visual");
      text(visual, "✓");
      wrapper.append(input, visual);
      dom.inputsLayer.append(wrapper);
      input.addEventListener("change", () => {
        wrapper.classList.remove("invalid");
        input.removeAttribute("aria-invalid");
        setAlert("");
      });
      return { item, input, wrapper };
    });

    function submit(): void {
      let firstInvalid: { input: HTMLInputElement; wrapper: HTMLElement } | null = null;
      for (const field of fields) {
        const valid = field.input.checked === field.item.expected;
        field.wrapper.classList.toggle("invalid", !valid);
        if (!valid) {
          field.input.setAttribute("aria-invalid", "true");
          if (!firstInvalid) firstInvalid = field;
        } else {
          field.input.removeAttribute("aria-invalid");
        }
      }
      if (firstInvalid) {
        setAlert(
          currentStep().messages?.error ?? "Revisa las casillas seleccionadas.",
        );
        firstInvalid.input.focus();
        return;
      }
      const message = successMessage();
      text(dom.feedback, message);
      actionIndex =
        clickIndex >= 0 ? clickIndex : currentStep().actions.length - 1;
      advance(message);
    }

    if (click) {
      renderClickAction(click, { formMode: true, onActivate: submit });
    } else {
      const button = createElement("button", "primary-button");
      button.type = "button";
      text(button, "Validar selección");
      button.addEventListener("click", submit);
      dom.actionArea.append(button);
    }
    window.requestAnimationFrame(() => fields[0]?.input.focus());
  };

  const renderInformativeAction = (action: InformativeAction) => {
    const instruction = createElement("p", "informative-copy");
    text(instruction, action.text);
    const button = createElement("button", "primary-button");
    button.type = "button";
    text(button, action.buttonLabel ?? "Continuar");
    button.addEventListener("click", () => advance());
    dom.actionArea.append(instruction, button);
  };

  function renderAction(preservedFeedback?: string): void {
    clearInteraction();
    if (preservedFeedback) {
      text(dom.feedback, preservedFeedback);
    }
    if (!imageReady) return;
    const step = currentStep();
    const checkboxIndex = step.actions.findIndex((action) => action.type === "checkbox");
    if (checkboxIndex >= 0) {
      const clickIndex = step.actions.findIndex(
        (action, index) => index > checkboxIndex && action.type === "click",
      );
      renderCheckboxGroup(
        step.actions[checkboxIndex] as CheckboxAction,
        clickIndex >= 0 ? (step.actions[clickIndex] as ClickAction) : null,
        clickIndex,
      );
      return;
    }
    if (step.formMode) {
      const clickIndex = step.actions.findIndex((action) => action.type === "click");
      if (clickIndex > 0) {
        const leading = step.actions.slice(0, clickIndex);
        if (leading.every((action) => action.type === "input")) {
          renderForm(
            leading as InputAction[],
            clickIndex,
            step.actions[clickIndex] as ClickAction,
          );
          return;
        }
      }
    }
    const action = currentAction();
    if (action.type === "click") {
      renderClickAction(action);
    } else if (action.type === "input") {
      renderInputAction(action);
    } else if (action.type === "informative") {
      renderInformativeAction(action);
    }
  }

  function showCompletion(preservedFeedback?: string): void {
    clearInteraction();
    if (preservedFeedback) {
      text(dom.feedback, preservedFeedback);
    }
    const completion = createElement("section", "completion-card");
    completion.setAttribute("role", "status");
    const heading = createElement("h2");
    text(heading, project.completion.title);
    const message = createElement("p");
    text(message, project.completion.message);
    completion.append(heading, message);
    dom.actionArea.append(completion);
    text(dom.stepCount, `Paso ${project.steps.length} de ${project.steps.length} · Completado`);
    dom.progress.value = 1;
  }

  function renderStep(preservedFeedback?: string): void {
    imageReady = false;
    clearInteraction();
    if (preservedFeedback) {
      text(dom.feedback, preservedFeedback);
    }
    const step = currentStep();
    const asset = project.assets.find((item) => item.id === step.assetId);
    if (!asset) {
      setAlert(`No existe la imagen del paso "${step.title}".`);
      return;
    }
    text(dom.title, step.title);
    text(dom.stepCount, `Paso ${stepIndex + 1} de ${project.steps.length}`);
    dom.progress.value = stepIndex / project.steps.length;
    text(dom.instruction, step.instruction);
    dom.image.alt = `Captura del paso: ${step.title}`;
    dom.image.onload = () => {
      imageReady = true;
      fitImageToViewport(dom.viewport, dom.stage, dom.image);
      renderAction();
    };
    dom.image.onerror = () => {
      imageReady = false;
      dom.hotspots.replaceChildren();
      dom.inputsLayer.replaceChildren();
      dom.actionArea.replaceChildren();
      setAlert("No se pudo cargar la imagen de este paso. No puedes continuar.");
    };
    dom.image.src = resolveAssetUrl(asset);
  }

  dom.viewport.addEventListener("click", (event) => {
    if (
      (event.target as HTMLElement).closest(
        ".hotspot, .overlay-input, .checkbox-overlay",
      )
    ) {
      return;
    }
    if (currentStep().actions.some((action) => action.type === "checkbox")) {
      text(
        dom.feedback,
        currentStep().messages?.error ??
          "Marca las casillas y usa el botón indicado para continuar.",
      );
      return;
    }
    if (currentStep().formMode) {
      text(
        dom.feedback,
        stepErrorMessage() ?? "Completa los campos y presiona el botón indicado.",
      );
      return;
    }
    if (currentAction().type !== "click") return;
    text(dom.feedback, stepErrorMessage() ?? "Haz clic dentro de la zona indicada. No se avanzó.");
  });
  window.addEventListener("resize", updateResolutionWarning);
  const observer = new ResizeObserver(() => {
    if (imageReady) fitImageToViewport(dom.viewport, dom.stage, dom.image);
  });
  observer.observe(dom.viewport);
  updateResolutionWarning();
  lms?.initialize(project.steps[initialIndex].id);
  renderStep();

  return {
    unmount: () => {
      if (unmounted) return;
      unmounted = true;
      observer.disconnect();
      window.removeEventListener("resize", updateResolutionWarning);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (lms) window.removeEventListener("beforeunload", lms.finish);
      dom.image.onload = null;
      dom.image.onerror = null;
      dom.root.replaceChildren();
    },
  };
}
