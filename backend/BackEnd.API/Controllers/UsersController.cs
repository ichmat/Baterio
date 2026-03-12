using BackEnd.API.Infrastructure;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Common;
using BackEnd.Shared.Models.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
[RoleAuthorize(UserRole.Admin)]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(new ApiResponse<List<UserResponse>> { Data = users });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _userService.GetUserByIdAsync(id);
        return Ok(new ApiResponse<UserResponse> { Data = user });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var user = await _userService.CreateUserAsync(request);
        return StatusCode(201, new ApiResponse<UserResponse> { Data = user });
    }

    [HttpPatch("{id}/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleRequest request)
    {
        var user = await _userService.UpdateUserRoleAsync(id, request);
        return Ok(new ApiResponse<UserResponse> { Data = user });
    }

    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        await _userService.DeactivateUserAsync(id);
        return NoContent();
    }

    [HttpPatch("{id}/reactivate")]
    public async Task<IActionResult> Reactivate(int id)
    {
        await _userService.ReactivateUserAsync(id);
        return NoContent();
    }
}
