import { CSSHelper } from "./helpers/CSSHelper";
import { formatPrice } from "./utils";

type EventListenersRegistry = Record<string, ((event: Event) => void)[]>;

const planForm = document.querySelector(".plan__form") as HTMLFormElement;
const planPageViews = document.querySelector(".plan__pageviews") as HTMLElement;
const planPricingValue = document.querySelector(".plan__pricing-label--value") as HTMLElement;
const planPricingTerm = document.querySelector(".plan__pricing-label--term") as HTMLElement;

planForm.addEventListener("submit", (e) => e.preventDefault());

const helper = {
    requestAnimationFrameAfter: (duration: number, callback: () => void) => {
        let startTime: number | null = null;
        function callbackLoop(currentTime: number) {
            if (startTime === null) startTime = currentTime;
            if (currentTime - startTime >= duration) callback();
            else requestAnimationFrame(callbackLoop);
        }
        requestAnimationFrame(callbackLoop);
    },

    suportTouch: () => {
        return (
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            // @ts-ignore: msMaxTouchPoints is a legacy property
            navigator.msMaxTouchPoints > 0
        );
    },

    registerEventListener: (element: HTMLElement, listeners: EventListenersRegistry) => {
        for (const eventName in listeners) {
            element.addEventListener(eventName, (e) => {
                for (let i = 0; i < listeners[eventName].length; i++) {
                    listeners[eventName][i](e);
                }
            });
        }
    },
};

const setupPaymentPeriodSwitch = () => {
    const input = document.querySelector("#payment-period-input") as HTMLInputElement;

    const isChecked = () => input.checked;

    input.addEventListener("change", () => {});

    return { isChecked };
};

const paymentPeriodSwitch = setupPaymentPeriodSwitch();

const setupPriceSlider = () => {
    const containerElement = document.querySelector(".plan__form") as HTMLElement;
    const sliderElement = document.querySelector(".slider") as HTMLElement;
    const inputElement = document.querySelector(".slider__input") as HTMLInputElement;
    const trackElement = document.querySelector(".slider__track") as HTMLElement;
    const progressElement = document.querySelector(".slider__progress") as HTMLElement;
    const thumbElement = document.querySelector(".slider__thumb") as HTMLElement;
    const dragOverlayElement = document.createElement("span") as HTMLElement;
    const clonedThumbElement = thumbElement.cloneNode(true) as HTMLElement;
    dragOverlayElement.appendChild(clonedThumbElement);

    const containerElementEvents: EventListenersRegistry = {
        mousemove: [],
        mouseleave: [],
        mouseup: [],
        touchmove: [],
        touchcancel: [],
        touchend: [],
    };
    const sliderElementEvents: EventListenersRegistry = { focus: [] };
    const inputElementEvents: EventListenersRegistry = {
        input: [],
        keydown: [],
    };
    const thumbElementEvents: EventListenersRegistry = {
        touchstart: [],
        mousedown: [],
    };

    const values: [number, string][] = [
        [8, "10k pageviews"],
        [12, "50k pageviews"],
        [16, "100k pageviews"],
        [24, "500k pageviews"],
        [36, "1m pageviews"],
    ];

    let thumbMoveSupressed: boolean = false;
    let thumbTransformOutdated: boolean = true;
    let currentValueIndex: number = 2;
    let pointerVSThumbOffsetX: number = 0;
    let currentThumbTranslateX: number = 0;

    const DRAG_OVERLAY_SCALE_RATIO = 1.2;

    const updateSliderValue = () => {
        let totalPrice = values[currentValueIndex][0];
        totalPrice = paymentPeriodSwitch.isChecked() ? totalPrice * 12 * 0.75 : totalPrice;
        const term = paymentPeriodSwitch.isChecked() ? "year" : "month";

        const priceText = formatPrice(totalPrice);
        const pageViewText = values[currentValueIndex][1];

        inputElement.setAttribute("aria-valuetext", `${priceText} per ${term} for ${pageViewText}`);
        inputElement.setAttribute("value", values[currentValueIndex][0].toString());
        inputElement.value = values[currentValueIndex][0].toString();

        planPricingValue.textContent = priceText;
        planPricingTerm.textContent = "/ " + term;
        planPageViews.textContent = pageViewText;
    };

    const selectNextValue = () => {
        if (currentValueIndex === values.length - 1) return;
        currentValueIndex++;
        thumbTransformOutdated = true;
        updateSliderValue();
    };

    const selectPreviosValue = () => {
        if (currentValueIndex == 0) return;
        currentValueIndex--;
        thumbTransformOutdated = true;
        updateSliderValue();
    };

    const selectMinimumValue = () => {
        currentValueIndex = 0;
        thumbTransformOutdated = true;
        updateSliderValue();
    };

    const selectMaximumValue = () => {
        currentValueIndex = values.length - 1;
        thumbTransformOutdated = true;
        updateSliderValue();
    };

    const calculateThumbStepWidth = () => {
        return (trackElement.clientWidth - thumbElement.clientWidth) / (values.length - 1);
    };

    const getClientPosition = (e: Event) => {
        let x = 0;
        let y = 0;

        if (helper.suportTouch() && e instanceof TouchEvent) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else if (e instanceof MouseEvent || e instanceof PointerEvent) {
            x = e.clientX;
            y = e.clientY;
        }
        return { x, y };
    };

    const snapThumbToTrack = (noAnimate: boolean) => {
        if (!thumbTransformOutdated) return;

        const transitionDuration = noAnimate ? 0 : 300;

        currentThumbTranslateX = calculateThumbStepWidth() * currentValueIndex;
        const progressWidthPercentage =
            ((currentThumbTranslateX + thumbElement.clientWidth / 2) * 100) / trackElement.clientWidth;

        requestAnimationFrame(() => {
            CSSHelper.setStyles(thumbElement, {
                transition: `transform ${transitionDuration}ms ease`,
                transform: `translateX(${currentThumbTranslateX}px)`,
            });

            CSSHelper.setStyles(progressElement, {
                transition: `width ${transitionDuration}ms ease`,
                width: `${progressWidthPercentage}%`,
            });
        });
    };

    const handleInputChange = (e: Event) => {
        const input = e.target as HTMLInputElement;
        input.value = values[currentValueIndex][0].toString();
    };

    const handleInputKeydown = (e: Event) => {
        if (!(e instanceof KeyboardEvent)) return;

        if (e.key == "ArrowRight" || e.key == "ArrowUp") {
            selectNextValue();
            e.preventDefault();
        } else if (e.key == "ArrowLeft" || e.key == "ArrowDown") {
            selectPreviosValue();
            e.preventDefault();
        } else if (e.key == "Home") {
            selectMinimumValue();
            e.preventDefault();
        } else if (e.key == "End") {
            selectMaximumValue();
            e.preventDefault();
        } else if ((e.shiftKey && e.key == "Tab") || e.key == "Tab") {
            return;
        }

        snapThumbToTrack(false);
    };

    const handleDragStart = (e: Event) => {
        e.preventDefault();

        const clientPosition = getClientPosition(e);
        const thumbElementRect = thumbElement.getBoundingClientRect();

        pointerVSThumbOffsetX = clientPosition.x - thumbElementRect.x;

        CSSHelper.setStyles(thumbElement, {
            opacity: "0.75",
            pointerEvents: "none",
        });

        CSSHelper.setStyles(dragOverlayElement, {
            zIndex: "999",
            position: "absolute",
            transform: `translateX(${currentThumbTranslateX}px)`,
        });

        trackElement.appendChild(dragOverlayElement);

        CSSHelper.setStyles(clonedThumbElement, {
            transition: "300ms ease",
        });

        requestAnimationFrame(() => {
            CSSHelper.setStyles(clonedThumbElement, {
                transform: `scale(${DRAG_OVERLAY_SCALE_RATIO})`,
                backgroundColor: "var(--color-cyan-500)",
            });
        });

        containerElementEvents.mousemove.push(handleDragMove);
        containerElementEvents.mouseleave.push(handleDragEnd);
        containerElementEvents.mouseup.push(handleDragEnd);
        containerElementEvents.touchmove.push(handleDragMove);
        containerElementEvents.touchcancel.push(handleDragEnd);
        containerElementEvents.touchend.push(handleDragEnd);
    };

    const handleDragMove = (e: Event) => {
        const clientPosition = getClientPosition(e);
        const trackElementRect = trackElement.getBoundingClientRect();

        if (!clientPosition.x) return;

        const dragOverlayScaledWidth = thumbElement.clientWidth * DRAG_OVERLAY_SCALE_RATIO - thumbElement.clientWidth;
        currentThumbTranslateX = clientPosition.x - trackElementRect.x - pointerVSThumbOffsetX;

        let currentDragOverlayTranslateX = currentThumbTranslateX - dragOverlayScaledWidth / 2;

        let minTranslateX = 0;
        let maxTranslateX = trackElement.clientWidth - dragOverlayElement.clientWidth;

        currentThumbTranslateX = Math.max(currentThumbTranslateX, minTranslateX);
        currentThumbTranslateX = Math.min(currentThumbTranslateX, maxTranslateX);

        currentDragOverlayTranslateX = Math.max(
            currentDragOverlayTranslateX,
            minTranslateX - dragOverlayScaledWidth / 2
        );
        currentDragOverlayTranslateX = Math.min(
            currentDragOverlayTranslateX,
            maxTranslateX + dragOverlayScaledWidth / 2
        );

        const thumbStepWidth = calculateThumbStepWidth();
        const thumbTranslateX = thumbStepWidth * currentValueIndex;

        const draggingRight = currentThumbTranslateX - thumbTranslateX > thumbStepWidth * 0.5;
        const draggingLeft = thumbTranslateX - currentThumbTranslateX > thumbStepWidth * 0.5;

        if (draggingRight) selectNextValue();
        else if (draggingLeft) selectPreviosValue();

        CSSHelper.setStyles(dragOverlayElement, {
            transform: `translateX(${currentDragOverlayTranslateX}px)`,
        });

        if (thumbMoveSupressed === false) {
            thumbMoveSupressed = true;

            CSSHelper.setStyles(thumbElement, {
                transition: "transform 200ms ease",
                transform: `translateX(${currentThumbTranslateX}px)`,
            });

            const trackValueWidth = currentThumbTranslateX + thumbElement.clientWidth / 2;

            CSSHelper.setStyles(progressElement, {
                transition: `width 150ms ease`,
                width: `${trackValueWidth}px`,
            });

            helper.requestAnimationFrameAfter(30, () => {
                thumbMoveSupressed = false;
            });
        }
    };

    const handleDragEnd = () => {
        containerElementEvents.mousemove = [];
        containerElementEvents.mouseleave = [];
        containerElementEvents.mouseup = [];
        containerElementEvents.touchmove = [];
        containerElementEvents.touchcancel = [];
        containerElementEvents.touchend = [];

        snapThumbToTrack(false);

        requestAnimationFrame(() => {
            CSSHelper.setStyles(dragOverlayElement, {
                transition: "300ms ease",
                transform: thumbElement.style.transform,
            });

            CSSHelper.removeStyles(clonedThumbElement, "background-color", "transform");

            helper.requestAnimationFrameAfter(300, () => {
                CSSHelper.setStyles(thumbElement, {
                    pointerEvents: "",
                    opacity: "",
                });

                CSSHelper.removeStyles(dragOverlayElement);
                dragOverlayElement.remove();
            });
        });
    };

    helper.registerEventListener(inputElement, inputElementEvents);
    helper.registerEventListener(sliderElement, sliderElementEvents);
    helper.registerEventListener(thumbElement, thumbElementEvents);
    helper.registerEventListener(containerElement, containerElementEvents);

    inputElementEvents.input.push(handleInputChange);
    inputElementEvents.keydown.push(handleInputKeydown);
    thumbElementEvents.mousedown.push(handleDragStart);
    thumbElementEvents.touchstart.push(handleDragStart);

    window.addEventListener("resize", () => {
        snapThumbToTrack(true);
    });

    snapThumbToTrack(true);
};

setupPriceSlider();
