using Microsoft.AspNetCore.Mvc;
using MaximServer.Services;
using MaximServer.Models;

namespace MaximServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpGet("messages")]
    public async Task<ActionResult<List<Message>>> GetMessages()
    {
        var messages = await _chatService.GetMessagesAsync();
        return Ok(messages);
    }

    [HttpPost("send")]
    public async Task<ActionResult<Message>> SendMessage([FromBody] SendMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Author) || string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest("Автор и текст сообщения обязательны");
        }

        var message = await _chatService.SendMessageAsync(request.Author, request.Text);
        
        if (message == null)
        {
            return BadRequest("Превышен лимит сообщений. Подождите немного перед отправкой следующего сообщения.");
        }

        return Ok(message);
    }

    [HttpGet("can-send")]
    public async Task<ActionResult<bool>> CanSendMessage([FromQuery] string author)
    {
        var canSend = await _chatService.CanSendMessageAsync(author);
        return Ok(canSend);
    }

    [HttpGet("check-username")]
    public async Task<ActionResult<UsernameCheckResponse>> CheckUsername([FromQuery] string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest("Имя пользователя не может быть пустым");
        }

        var isAvailable = await _chatService.IsUsernameAvailableAsync(username);
        return Ok(new UsernameCheckResponse 
        { 
            IsAvailable = isAvailable,
            Message = isAvailable ? "Имя доступно" : "Это имя уже занято. Выберите другое."
        });
    }
}

public class SendMessageRequest
{
    public string Author { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class UsernameCheckResponse
{
    public bool IsAvailable { get; set; }
    public string Message { get; set; } = string.Empty;
}

