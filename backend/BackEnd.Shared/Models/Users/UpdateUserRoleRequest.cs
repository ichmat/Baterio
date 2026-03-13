using System.ComponentModel.DataAnnotations;
using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Models.Users;

public class UpdateUserRoleRequest
{
    [Required]
    public UserRole Role { get; set; }
}
