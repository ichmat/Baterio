namespace BackEnd.Shared.Models.Quotes;

public class QuoteSearchResult
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
