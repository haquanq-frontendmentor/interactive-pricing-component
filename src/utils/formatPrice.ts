export const formatPrice = (value: number) => {
    return value.toLocaleString("en-US", {
        currency: "USD",
        style: "currency",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });
};
