using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Models.Auth;

public class UserInfo
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public UserRole Role { get; set; }
    public int TenantId { get; set; }
}
