namespace ShreeJiMart.Api.Models;

public static class DiscountTypes
{
    public const string Rupees = "rupees";
    public const string Percent = "percent";
}

public static class ProductPricing
{
    public static decimal EffectivePrice(Product product) =>
        EffectivePrice(product.Price, product.DiscountType, product.DiscountValue);

    public static decimal EffectivePrice(decimal price, string? discountType, decimal? discountValue)
    {
        if (string.IsNullOrWhiteSpace(discountType) || discountValue is null || discountValue <= 0)
            return price;

        return discountType.Trim().ToLowerInvariant() switch
        {
            DiscountTypes.Rupees when discountValue < price => discountValue.Value,
            DiscountTypes.Percent when discountValue > 0 && discountValue < 100 =>
                Math.Round(price * (1 - discountValue.Value / 100m), 2, MidpointRounding.AwayFromZero),
            _ => price,
        };
    }

    public static bool HasDiscount(Product product) =>
        EffectivePrice(product) < product.Price;

    public static (string? ErrorMessage, string? DiscountType, decimal? DiscountValue) NormalizeDiscount(
        decimal price,
        string? discountType,
        decimal? discountValue)
    {
        if (string.IsNullOrWhiteSpace(discountType) || discountValue is null || discountValue == 0)
            return (null, null, null);

        var type = discountType.Trim().ToLowerInvariant();
        if (type is not (DiscountTypes.Rupees or DiscountTypes.Percent))
            return ("Discount type must be rupees or percent.", null, null);

        if (type == DiscountTypes.Rupees)
        {
            if (discountValue < 0)
                return ("Sale price must be >= 0.", null, null);

            if (discountValue >= price)
                return ("Sale price must be less than regular price.", null, null);

            return (null, type, discountValue);
        }

        if (discountValue <= 0 || discountValue >= 100)
            return ("Discount percent must be greater than 0 and less than 100.", null, null);

        return (null, type, discountValue);
    }
}
