namespace BackEnd.Shared.Entities;

public class Tenant
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Subscription { get; set; }
    public string? Configuration { get; set; }
    public int QuoteRefYear { get; set; }
    public int QuoteRefSequence { get; set; }
    public int SiteRefYear { get; set; }
    public int SiteRefSequence { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
    public CompanyInfo? CompanyInfo { get; set; }
}
