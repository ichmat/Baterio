using BackEnd.Shared.Models.Auth;

namespace BackEnd.Shared.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request);
    Task RevokeRefreshTokenAsync(int userId);
}
