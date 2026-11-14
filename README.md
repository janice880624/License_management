# 證照管理系統（Google Sheet 版）

每位使用者把資料存在**自己的** Google Sheet，網站本身不存任何資料。

```
使用者瀏覽器 ──(貼上的 /exec 網址)──▶ 使用者自己副本裡的 Apps Script ──▶ 使用者自己的 Sheet
```

## 一、建立範本 Sheet（你只要做一次）

1. 新增一個 Google 試算表，命名為「證照管理系統（範本）」。
2. 點「擴充功能 → Apps Script」，刪掉預設內容，把 `Code.gs` 整份貼上，然後儲存。
3. 上方函式選單選 `setup`，按「執行」並授權。執行後會建立「證照、進修紀錄、證照分類、課程類別」分頁和預設分類。
   回到 Sheet，把空的「工作表1」刪掉（沒被自動刪掉的話）。
4. 點右上角「共用」，一般存取權設成「知道連結的任何人」可以**檢視**。
5. 複製 Sheet 網址，把 `/edit…` 之後的部分改成 `/copy`：
   `https://docs.google.com/spreadsheets/d/你的ID/copy`
6. 打開 `index.html`，把這個網址填進最上面的設定：
   ```js
   const CONFIG={templateCopyUrl:'https://docs.google.com/spreadsheets/d/你的ID/copy'};
   ```

> 範本本身**不需要部署**。使用者複製後，Apps Script 會跟著被複製到他們自己的副本。

## 二、放上 GitHub Pages

建一個 repo（例如 `cert-manager`），放進 `index.html`，到 Settings → Pages 開啟。
網址會是 `https://janice880624.github.io/cert-manager/`，把這個網址分享出去即可。

## 三、使用者怎麼用

網站上按「連結 Google Sheet」會有步驟說明：

1. 按「建立我的副本」。
2. 在副本中點「擴充功能 → Apps Script → 部署 → 新增部署作業 → 網頁應用程式」，
   「執行身分」選**我**，「誰可以存取」選**所有人**，然後部署並授權。
3. 把 `/exec` 結尾的網址貼回網站。

換裝置時，只要再貼一次同一個網址。

## 隱私說明

- 網站作者看不到任何人的資料，資料都在使用者自己的雲端硬碟。
- `/exec` 網址等於鑰匙，拿到網址的人就能讀寫那份資料，請提醒使用者不要分享。
- 授權時會出現「Google 尚未驗證這個應用程式」，這是正常的，因為程式碼是使用者自己副本裡的腳本。
- 不連結 Sheet 也能用，資料只會存在那台裝置的瀏覽器。

## 之後若要更新 Code.gs

已經複製的使用者不會自動更新，他們要把新的 `Code.gs` 貼進自己的 Apps Script，
再到「部署 → 管理部署作業 → 編輯 → 版本：新版本」重新部署，網址不會變。
所以目前的 API 盡量保持簡單：GET 讀取全部資料、POST 寫入全部資料。
