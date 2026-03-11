using System.Security.Claims;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        return Ok(response);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        var response = await _authService.RefreshTokenAsync(request);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null || !int.TryParse(userClaim.Value, out var userId))
        {
            throw new ApiErrorException(ApiError.Unauthorized);
        }

        await _authService.RevokeRefreshTokenAsync(userId);
        return NoContent();
    }
}
