namespace BackEnd.Shared.Models.Sites;

public class SiteSearchResult
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string SiteAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
