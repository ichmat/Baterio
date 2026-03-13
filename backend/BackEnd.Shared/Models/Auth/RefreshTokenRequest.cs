using System.ComponentModel.DataAnnotations;

namespace BackEnd.Shared.Models.Auth;

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
