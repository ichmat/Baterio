namespace BackEnd.Shared.Models.Quotes;

public class QuoteLineResponse
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPriceExclTax { get; set; }
    public decimal LineTotalExclTax { get; set; }  // Computed: Quantity * UnitPriceExclTax
    public int DisplayOrder { get; set; }
}
