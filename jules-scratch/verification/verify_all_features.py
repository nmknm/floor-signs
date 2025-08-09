import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # --- Helper function for screenshots ---
        async def take_screenshot(name):
            await page.wait_for_timeout(500) # Wait for canvas to redraw
            await page.screenshot(path=f"jules-scratch/verification/{name}.png")

        # --- Navigate and Initial State ---
        await page.goto("file:///app/index.html")
        canvas_locator = page.locator("#floor-sign-canvas")
        await expect(canvas_locator).to_be_visible()

        # Get the initial (blank) data URL.
        initial_data_url = await canvas_locator.evaluate("canvas => canvas.toDataURL()")

        # Poll until the canvas is rendered.
        for _ in range(20): # Max 10 seconds timeout
            await page.wait_for_timeout(500)
            current_data_url = await canvas_locator.evaluate("canvas => canvas.toDataURL()")
            if current_data_url != initial_data_url:
                break
        else:
            raise Exception("Timeout: Canvas did not render.")

        await take_screenshot("step1_initial_state")

        # --- Test 1: Change Text, Colors, and Angle ---
        await page.locator("#text-input").fill("L")
        # For color inputs, we need to set the value via evaluation and then trigger the input event
        await page.locator("#font-color-picker").evaluate("e => e.value = '#FF0000'")
        await page.locator("#font-color-picker").dispatch_event('input')
        await page.locator("#bg-color-1").evaluate("e => e.value = '#222222'")
        await page.locator("#bg-color-1").dispatch_event('input')
        await page.locator("#bg-color-2").evaluate("e => e.value = '#000000'")
        await page.locator("#bg-color-2").dispatch_event('input')
        await page.locator("#gradient-angle").fill("45")
        await page.locator("#gradient-angle").dispatch_event('input') # Also trigger for range slider
        await take_screenshot("step2_style_change")

        # --- Test 2: Save Preset ---
        save_prompt_handler = lambda dialog: asyncio.create_task(dialog.accept("Test Preset"))
        page.on("dialog", save_prompt_handler)
        await page.locator("#save-preset-btn").click()
        page.remove_listener("dialog", save_prompt_handler)

        # Verify the preset appears in the dropdown
        await expect(page.locator("#preset-select")).to_contain_text("Test Preset")

        # --- Test 3: Reset UI and Load Preset ---
        await page.locator("#text-input").fill("P")
        await page.locator("#font-color-picker").evaluate("e => e.value = '#FFFFFF'")
        await page.locator("#font-color-picker").dispatch_event('input')
        await page.locator("#gradient-angle").fill("180")
        await page.locator("#gradient-angle").dispatch_event('input')
        await take_screenshot("step3_before_preset_load")

        await page.locator("#preset-select").select_option("Test Preset")

        # --- Test 4: Verify Preset Loaded Correctly ---
        await expect(page.locator("#text-input")).to_have_value("L")
        await expect(page.locator("#font-color-picker")).to_have_value("#ff0000")
        await expect(page.locator("#bg-color-1")).to_have_value("#222222")
        await expect(page.locator("#gradient-angle")).to_have_value("45")
        await take_screenshot("step4_after_preset_load")

        # --- Test 5: Verify SVG Download ---
        async with page.expect_download() as download_info:
            await page.locator("#format-select").select_option("svg")
            await page.locator("#download-btn").click()

        download = await download_info.value
        assert ".svg" in download.suggested_filename
        print("SVG Download test passed.")

        # --- Test 6: Delete Preset ---
        delete_confirm_handler = lambda dialog: asyncio.create_task(dialog.accept())
        page.on("dialog", delete_confirm_handler)
        await page.locator("#delete-preset-btn").click()
        page.remove_listener("dialog", delete_confirm_handler)

        # Verify the preset is gone by checking the options manually
        options = await page.locator("#preset-select > option").all_text_contents()
        if "Test Preset" in options:
            raise Exception("Error: Deleted preset 'Test Preset' is still present in the dropdown.")

        print("Delete Preset test passed.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
