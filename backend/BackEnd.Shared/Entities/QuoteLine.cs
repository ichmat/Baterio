namespace BackEnd.Shared.Entities;

public class QuoteLine
{
    public int Id { get; set; }
    public int QuoteId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPriceExclTax { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation property
    public Quote Quote { get; set; } = null!;
}
