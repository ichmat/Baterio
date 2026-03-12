namespace BackEnd.Shared.Models.Company;

public class SubscriptionInfoResponse
{
    public string Plan { get; set; } = string.Empty;
    public int ActiveUsers { get; set; }
    public int? MaxUsers { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
