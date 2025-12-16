using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using MaximServer.Data;
using MaximServer.Services;

var builder = WebApplication.CreateBuilder(args);

// Добавляем сервисы
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS для работы с фронтендом
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// База данных SQLite
builder.Services.AddDbContext<MaximDbContext>(options =>
    options.UseSqlite("Data Source=maxim.db"));

// Сервисы
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IAdminService, AdminService>();

// Настройка URL для стабильной работы
builder.WebHost.UseUrls("http://localhost:5000", "http://127.0.0.1:5000");

var app = builder.Build();

// Создаем базу данных при запуске
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MaximDbContext>();
    db.Database.EnsureCreated();
}

// Настройка middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("Сервер запущен на http://localhost:5000");
Console.WriteLine("API доступен по адресу: http://localhost:5000/api");
Console.WriteLine("Swagger UI: http://localhost:5000/swagger");

app.Run();

