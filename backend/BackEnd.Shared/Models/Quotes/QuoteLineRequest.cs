namespace BackEnd.Shared.Models.Quotes;

public class QuoteLineRequest
{
    public int? Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPriceExclTax { get; set; }
    public int DisplayOrder { get; set; }
}
