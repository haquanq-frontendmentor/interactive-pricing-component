const helper = {
    requestAnimationFrameAfter(duration, fn) {
        let startTime;
        function loop(t) {
            if (startTime === undefined) startTime = t;
            if (t - startTime < duration) requestAnimationFrame(loop);
            else fn();
        }
        requestAnimationFrame(loop);
    },

    suportTouch() {
        return (
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    },
};

const mainForm = {
    _formElement: document.querySelector(".pricing__form"),
    _pageViewElement: document.querySelector(".pricing__form__pageview"),
    _priceValueElement: document.querySelector(".pricing__form__price--value"),
    _priceTermElement: document.querySelector(".pricing__form__price--term"),
    init() {
        this._formElement.addEventListener("submit", (e) => {
            e.preventDefault();
        });
    },
};

const billingSwitch = {
    inputElement: document.querySelector(".switch__input"),
    isChecked() {
        return this.inputElement.checked;
    },
    handleChangeEvent(e) {
        priceSlider._updateSliderValue();
    },
    init() {
        this.inputElement.addEventListener("change", this.handleChangeEvent);
    },
};

const priceSlider = {
    _containerElement: document.querySelector(".pricing__form"),
    _containerElementEvents: {
        mousemove: [],
        mouseleave: [],
        mouseup: [],
        touchmove: [],
        touchcancel: [],
        touchend: [],
    },
    _sliderElement: document.querySelector(".slider"),
    _sliderElementEvents: { focus: [] },
    _inputElement: document.querySelector(".slider__input"),
    _inputElementEvents: {
        input: [],
        keydown: [],
    },
    _trackElement: document.querySelector(".slider__track"),
    _trackElementEvents: {},
    _trackValueElement: document.querySelector(".slider__track__inner"),
    _trackValueElementEvents: {},
    _thumbElement: document.querySelector(".slider__thumb"),
    _thumbElementEvents: {
        touchstart: [],
        mousedown: [],
    },
    _thumbPulling: false,
    _ghostElement: document.createElement("div"),
    _ghostThumbElement: null,
    _latestGhostTranslateX: null,

    _values: [
        [8, "10k pageviews"],
        [12, "50k pageviews"],
        [16, "100k pageviews"],
        [24, "500k pageviews"],
        [36, "1m pageviews"],
    ],
    _thumbTransformSupressed: false,
    _thumbTransformOutdated: true,
    _currentValueIndex: 2,
    _pointerThumbOffsetX: 0,

    _updateSliderValue() {
        let price = this._values[this._currentValueIndex][0];
        price = billingSwitch.isChecked() ? price * 12 * 0.75 : price;
        const term = billingSwitch.isChecked() ? "year" : "month";

        const priceText = price.toLocaleString("en-US", {
            currency: "USD",
            style: "currency",
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
        });
        const pageViewText = this._values[this._currentValueIndex][1];

        this._inputElement.setAttribute(
            "aria-valuetext",
            `${priceText} per ${term} for ${pageViewText}`
        );
        this._inputElement.setAttribute("value", this._values[this._currentValueIndex][0]);
        this._inputElement.value = this._values[this._currentValueIndex][0];

        mainForm._priceValueElement.textContent = priceText;
        mainForm._priceTermElement.textContent = "/ " + term;
        mainForm._pageViewElement.textContent = pageViewText;
    },
    _selectNextValue() {
        if (this._currentValueIndex == this._values.length - 1) return;
        this._currentValueIndex++;
        this._thumbTransformOutdated = true;
        this._updateSliderValue();
    },
    _selectPreviosValue() {
        if (this._currentValueIndex == 0) return;
        this._currentValueIndex--;
        this._thumbTransformOutdated = true;
        this._updateSliderValue();
    },
    _selectMinimumValue() {
        this._currentValueIndex = 0;
        this._thumbTransformOutdated = true;
        this._updateSliderValue();
    },
    _selectMaximumValue() {
        this._currentValueIndex = this._values.length - 1;
        this._thumbTransformOutdated = true;
        this._updateSliderValue();
    },
    _calculateThumbStepWidth() {
        return (
            (this._trackElement.clientWidth - this._thumbElement.clientWidth) /
            (this._values.length - 1)
        );
    },
    _extractClientPosition(e) {
        let x = null;
        let y = null;

        if (helper.suportTouch() && e instanceof TouchEvent) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else if (e instanceof MouseEvent || e instanceof PointerEvent) {
            x = e.clientX;
            y = e.clientY;
        }
        return { x, y };
    },

    _updateThumbPosition() {
        if (!this._thumbTransformOutdated) return;
        const translateX = this._calculateThumbStepWidth() * this._currentValueIndex;

        requestAnimationFrame(() => {
            this._thumbElement.style.transition = `transform 300ms ease`;
            this._thumbElement.style.transform = `translateX(calc(${translateX}px))`;
            this._trackValueElement.style.transition = `width 300ms ease`;
            this._trackValueElement.style.width = `${
                ((translateX + this._thumbElement.clientWidth / 2) * 100) /
                this._trackElement.clientWidth
            }%`;
        });
    },

    _registerEventListener(element, elementEvents) {
        for (const eventName in elementEvents) {
            element.addEventListener(eventName, (e) => {
                for (let i = 0; i < elementEvents[eventName].length; i++) {
                    elementEvents[eventName][i](this, e);
                }
            });
        }
    },

    _handleInputChange(self, e) {
        e.target.value = self._values[self._currentValueIndex][0];
    },
    _handleInputKeydown(self, e) {
        if (e.key == "ArrowRight" || e.key == "ArrowUp") {
            self._selectNextValue();
            e.preventDefault();
        } else if (e.key == "ArrowLeft" || e.key == "ArrowDown") {
            self._selectPreviosValue();
            e.preventDefault();
        } else if (e.key == "Home") {
            self._selectMinimumValue();
            e.preventDefault();
        } else if (e.key == "End") {
            self._selectMaximumValue();
            e.preventDefault();
        } else if ((e.shiftKey && e.key == "Tab") || e.key == "Tab") {
            return;
        }

        self._updateThumbPosition();
    },

    _handleThumbPull(self, e) {
        e.preventDefault();
        if (self._ghostThumbElement == undefined) {
            self._ghostThumbElement = self._thumbElement.cloneNode(true);
            self._ghostElement.appendChild(self._ghostThumbElement);
        }

        console.log("Thumb pulled!");
        const clientPosition = self._extractClientPosition(e);
        const thumbElementRect = self._thumbElement.getBoundingClientRect();

        self._pointerThumbOffsetX = clientPosition.x - thumbElementRect.left;

        requestAnimationFrame(() => {
            self._thumbElement.style.opacity = "0.75";
            self._thumbElement.style.pointerEvents = "none";
            self._trackElement.appendChild(self._ghostElement);

            self._ghostElement.style.zIndex = "999";
            self._ghostElement.style.pointerEvents = "none";
            self._ghostElement.style.position = "absolute";
            self._ghostElement.style.left = "0";
            self._ghostElement.style.borderRadius = "9999px";
            self._ghostElement.style.transform = priceSlider._thumbElement.style.transform;

            self._ghostThumbElement.style.transform = "";
            self._ghostThumbElement.style.pointerEvents = "none";
            requestAnimationFrame(() => {
                self._ghostThumbElement.style.backgroundColor = "var(--clr-cyan-500)";
                self._ghostThumbElement.style.transition = "200ms ease";
                self._ghostThumbElement.style.transform = "scale(1.2)";
            });
        });

        self._containerElementEvents.mousemove.push(self._handleThumbMove);
        self._containerElementEvents.mouseleave.push(self._handleThumbRelease);
        self._containerElementEvents.mouseup.push(self._handleThumbRelease);
        self._containerElementEvents.touchmove.push(self._handleThumbMove);
        self._containerElementEvents.touchcancel.push(self._handleThumbRelease);
        self._containerElementEvents.touchend.push(self._handleThumbRelease);
    },
    _handleThumbMove(self, e) {
        self._thumbPulling = true;
        const clientPosition = self._extractClientPosition(e);
        const trackElementRect = self._trackElement.getBoundingClientRect();

        const ghostThumbScaledUp =
            (self._thumbElement.clientWidth * 1.2 - self._thumbElement.clientWidth) / 2;

        let ghostTranslateX = clientPosition.x - trackElementRect.left - self._pointerThumbOffsetX;

        let minTranslateX = 0 - ghostThumbScaledUp;
        let maxTranslateX =
            self._trackElement.clientWidth - self._ghostElement.clientWidth + ghostThumbScaledUp;

        ghostTranslateX = Math.max(ghostTranslateX, minTranslateX);
        ghostTranslateX = Math.min(ghostTranslateX, maxTranslateX);

        const thumbStepWidth = self._calculateThumbStepWidth();
        const thumbTranslateX = thumbStepWidth * self._currentValueIndex;

        const ghostWentRight = ghostTranslateX - thumbTranslateX > thumbStepWidth * 0.5;
        const ghostWentLeft = thumbTranslateX - ghostTranslateX > thumbStepWidth * 0.5;

        if (ghostWentRight) self._selectNextValue();
        else if (ghostWentLeft) self._selectPreviosValue();

        requestAnimationFrame(() => {
            self._ghostElement.style.transform = `translateX(${ghostTranslateX}px)`;

            if (!self._thumbTransformSupressed) {
                self._thumbTransformSupressed = true;

                self._thumbElement.style.transition = "transform 150ms ease";
                self._thumbElement.style.transform = `translateX(${ghostTranslateX}px)`;

                const trackValueWidth = ghostTranslateX + self._thumbElement.clientWidth / 2;
                self._trackValueElement.style.transition = `width 150ms ease`;
                self._trackValueElement.style.width = `${trackValueWidth}px`;

                helper.requestAnimationFrameAfter(30, () => {
                    if (self._thumbPulling && self._latestGhostTranslateX != null) {
                        self._ghostElement.style.transform = `translateX(${self._latestGhostTranslateX}px)`;
                    }
                    self._thumbTransformSupressed = false;
                });
            }
        });
    },
    _handleThumbRelease(self, e) {
        self._containerElementEvents.mousemove = [];
        self._containerElementEvents.mouseleave = [];
        self._containerElementEvents.mouseup = [];
        self._containerElementEvents.touchmove = [];
        self._containerElementEvents.touchcancel = [];
        self._containerElementEvents.touchend = [];

        console.log("Thumb released!");
        self._thumbPulling = false;
        self._updateThumbPosition();

        requestAnimationFrame(() => {
            self._ghostElement.style.transition = "300ms ease";
            self._ghostElement.style.transform = self._thumbElement.style.transform;
            self._ghostThumbElement.style.transform = "";
            self._ghostThumbElement.style.backgroundColor = "";

            helper.requestAnimationFrameAfter(300, () => {
                self._thumbElement.style.pointerEvents = "";
                self._thumbElement.style.opacity = "";

                self._ghostElement.style.transition = "";
                self._ghostElement.remove();
            });
        });
    },
    init() {
        this._registerEventListener(this._inputElement, this._inputElementEvents);
        this._registerEventListener(this._sliderElement, this._sliderElementEvents);
        this._registerEventListener(this._thumbElement, this._thumbElementEvents);
        this._registerEventListener(this._containerElement, this._containerElementEvents);

        this._inputElementEvents.input.push(this._handleInputChange);
        this._inputElementEvents.keydown.push(this._handleInputKeydown);
        this._thumbElementEvents.mousedown.push(this._handleThumbPull);
        this._thumbElementEvents.touchstart.push(this._handleThumbPull);

        window.addEventListener("resize", () => {
            const translateX = this._calculateThumbStepWidth() * this._currentValueIndex;
            requestAnimationFrame(() => {
                this._thumbElement.style.transition = ``;
                this._thumbElement.style.transform = `translateX(${translateX}px)`;
            });
        });

        this._updateThumbPosition();
    },
};

mainForm.init();
priceSlider.init();
billingSwitch.init();
