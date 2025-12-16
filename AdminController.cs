using Microsoft.AspNetCore.Mvc;
using MaximServer.Services;

namespace MaximServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpPost("clear-chat")]
    public async Task<ActionResult> ClearChat([FromBody] ClearChatRequest request)
    {
        var success = await _adminService.ClearChatAsync(request.Username);
        
        if (!success)
        {
            return Unauthorized("Только администратор может очистить чат");
        }

        return Ok(new { message = "Чат успешно очищен" });
    }

    [HttpGet("is-admin")]
    public async Task<ActionResult<bool>> IsAdmin([FromQuery] string username)
    {
        var isAdmin = await _adminService.IsAdminAsync(username);
        return Ok(isAdmin);
    }
}

public class ClearChatRequest
{
    public string Username { get; set; } = string.Empty;
}

