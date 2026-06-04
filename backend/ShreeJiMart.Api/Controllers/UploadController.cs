using Microsoft.AspNetCore.Mvc;

namespace ShreeJiMart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UploadController(IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
    };

    private const long MaxBytes = 2 * 1024 * 1024;

    [HttpPost("product-image")]
    [RequestSizeLimit(MaxBytes)]
    public async Task<ActionResult<UploadResponse>> UploadProductImage(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest("File is empty.");
        if (file.Length > MaxBytes) return BadRequest("Max file size is 2 MB.");

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
            return BadRequest("Allowed formats: JPG, PNG, WEBP, GIF.");

        var uploadsDir = Path.Combine(env.WebRootPath, "uploads", "products");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var fullPath = Path.Combine(uploadsDir, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, ct);
        }

        var url = $"/uploads/products/{fileName}";
        return Ok(new UploadResponse(url));
    }

    public sealed record UploadResponse(string Url);
}
