CÁCH ĐĂNG GAME LÊN WEB ĐỂ AI CÓ LINK LÀ CHƠI ĐƯỢC

(1) Netlify (nhanh nhất)
- Vào Netlify -> Sites -> Add new site -> Deploy manually
- KÉO THẢ file ZIP này vào trang deploy
- Netlify sẽ tạo link https://....netlify.app

Lưu ý: file index.html phải ở tầng gốc (đã chuẩn trong gói này).

(2) GitHub Pages
- Tạo repo GitHub -> upload toàn bộ file trong zip (index.html, *.js, *.css)
- Settings -> Pages -> Deploy from branch -> main / (root)
- Link sẽ là: https://<username>.github.io/<repo>/

(3) itch.io (HTML5)
- Create new project -> chọn HTML5
- Upload zip này -> tick 'This file will be played in the browser'
- Publish -> có link chia sẻ.

Test local (tự kiểm tra trước khi gửi link):
- VSCode Live Server hoặc chạy: npx serve .
