export const CSSHelper = {
    removeStyles: (element: HTMLElement, ...props: string[]): void => {
        if (props.length === 0) {
            element.removeAttribute("style");
            return;
        }

        for (const prop of props) {
            element.style.removeProperty(prop);
        }
    },
    setStyles: (element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void => {
        for (const [key, value] of Object.entries(styles)) {
            if (value !== undefined && value !== null) {
                // @ts-expect-error: index signature not strict in CSSStyleDeclaration
                element.style[key] = value;
            }
        }
    },
    copyStyles: (fromElement: HTMLElement, toElement: HTMLElement) => {
        const computedStyle = window.getComputedStyle(fromElement);
        toElement.style.cssText = computedStyle.cssText;
    },
};
