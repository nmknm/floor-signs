import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("file:///app/index.html")
        canvas_locator = page.locator("#floor-sign-canvas")
        await expect(canvas_locator).to_be_visible()

        # Get the initial (blank) data URL.
        initial_data_url = await canvas_locator.evaluate("canvas => canvas.toDataURL()")

        # Poll until the canvas is rendered.
        for i in range(20): # Max 10 seconds timeout
            await page.wait_for_timeout(500)
            current_data_url = await canvas_locator.evaluate("canvas => canvas.toDataURL()")
            print(f"Polling attempt {i+1}: Data URL length = {len(current_data_url)}")
            if current_data_url != initial_data_url:
                print("Canvas has changed!")
                break
        else:
            await page.screenshot(path="jules-scratch/verification/simple_draw_fail.png")
            raise Exception("Timeout: Simple canvas draw did not happen.")

        print("Simple draw test passed. Taking screenshot.")
        await page.screenshot(path="jules-scratch/verification/simple_draw_success.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
