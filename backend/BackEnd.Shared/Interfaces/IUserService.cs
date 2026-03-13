using BackEnd.Shared.Models.Users;

namespace BackEnd.Shared.Interfaces;

public interface IUserService
{
    Task<List<UserResponse>> GetAllUsersAsync();
    Task<UserResponse> GetUserByIdAsync(int id);
    Task<UserResponse> CreateUserAsync(CreateUserRequest request);
    Task<UserResponse> UpdateUserRoleAsync(int id, UpdateUserRoleRequest request);
    Task DeactivateUserAsync(int id);
    Task ReactivateUserAsync(int id);
}
