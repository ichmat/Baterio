namespace BackEnd.Shared.Models.Customers;

public class CustomerSearchResult
{
    public int Id { get; set; }
    public string LastName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string? Telephone { get; set; }
    public string? Email { get; set; }
    public int QuoteCount { get; set; }
    public int SiteCount { get; set; }
}
