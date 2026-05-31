# Story AI 鈥?AI 鏁呬簨鍏卞垱

闈㈠悜 3-8 宀佸効绔ョ殑 AI 鏁呬簨鍒涗綔 Web 搴旂敤銆傚瀛愰€夋嫨瑙掕壊鍜屽満鏅紝AI 鑷姩鐢熸垚甯︽彃鐢诲拰閰嶉煶鐨勪簰鍔ㄦ晠浜嬨€?
## 鍔熻兘

- 馃幁 **瑙掕壊閫夋嫨** 鈥?8 涓鏍煎悇寮傜殑瑙掕壊锛屾瘡涓湁鐙壒褰㈣薄鍜屽０闊?- 馃實 **鍦烘櫙璁惧畾** 鈥?澶╃┖涔嬪煄銆佹捣娲嬬帇鍥姐€佺硸鏋滃煄鍫°€佹暟瀛椾笘鐣岀瓑
- 鉁嶏笍 **鍓ф儏鍏卞垱** 鈥?瀛╁瓙杈撳叆鍏抽敭鎯呰妭锛孉I 琛ュ叏鏁呬簨
- 馃帹 **AI 鎻掔敾** 鈥?姣忛〉鏁呬簨鑷姩鐢熸垚閰嶅浘
- 馃攰 **璇煶鏈楄** 鈥?TTS 鑷姩閰嶉煶锛屾敮鎸佸闀垮綍鍏ュ０闊?- 馃摫 **妯睆閫傞厤** 鈥?鎵嬫満妯睆瀹屾暣閫傞厤锛岄€傚悎鍎跨鎵嬫寔浣跨敤
- 馃懆鈥嶐煈┾€嶐煈?**瀹堕暱涓績** 鈥?鏌ョ湅鍜岀鐞嗗凡鐢熸垚鐨勬晠浜?
## 鎴浘

![棣栭〉](screenshots/home.png)
![鏁呬簨鎾斁](screenshots/player.png)

## 鎶€鏈爤

| 灞?| 鎶€鏈?|
|------|------|
| 鍓嶇 | React 18 + TypeScript + Vite + Tailwind CSS |
| 鍚庣 | Node.js + Express + TypeScript |
| 鏁版嵁搴?| MongoDB + SQLite |
| AI 妯″瀷 | DeepSeek锛堟枃鏈敓鎴愶級+ 璞嗗寘 ARK锛堝浘鐗囩敓鎴?+ TTS锛?|
| 鍥惧儚澶勭悊 | Sharp |

## 蹇€熷紑濮?
### 鐜瑕佹眰

- Node.js >= 18
- MongoDB锛堟湰鍦拌繍琛岋級

### 瀹夎

```bash
# 瀹夎鎵€鏈変緷璧?npm run install:all

# 閰嶇疆鐜鍙橀噺
cp server/.env.example server/.env
# 缂栬緫 server/.env锛屽～鍏ヤ綘鐨?API 瀵嗛挜锛?#   DEEPSEEK_API_KEY=浣犵殑DeepSeek瀵嗛挜
#   ARK_API_KEY=浣犵殑璞嗗寘ARK瀵嗛挜
#   TTS_API_KEY=浣犵殑TTS瀵嗛挜
```

### 杩愯

```bash
# 鍚屾椂鍚姩鍓嶅悗绔?npm run dev

# 鎴栧垎鍒惎鍔?npm run dev:client   # 鍓嶇 http://localhost:5173
npm run dev:server   # 鍚庣 http://localhost:3000
```

### 鏋勫缓

```bash
npm run build
```

## 椤圭洰缁撴瀯

```
story-AI/
鈹溾攢鈹€ client/                # 鍓嶇 React 搴旂敤
鈹?  鈹溾攢鈹€ src/
鈹?  鈹?  鈹溾攢鈹€ pages/         # 椤甸潰缁勪欢
鈹?  鈹?  鈹?  鈹溾攢鈹€ Home/          # 棣栭〉
鈹?  鈹?  鈹?  鈹溾攢鈹€ CharacterSelect/  # 瑙掕壊閫夋嫨
鈹?  鈹?  鈹?  鈹溾攢鈹€ AiCreate/      # AI 鍒涗綔锛堝満鏅啋鍓ф儏鈫掔瓑寰呯敓鎴愶級
鈹?  鈹?  鈹?  鈹溾攢鈹€ StoryPlayer/   # 鏁呬簨鎾斁鍣?鈹?  鈹?  鈹?  鈹溾攢鈹€ SavedStories/  # 宸蹭繚瀛樻晠浜?鈹?  鈹?  鈹?  鈹溾攢鈹€ StoryBox/      # 鏁呬簨瀹濈洅
鈹?  鈹?  鈹?  鈹斺攢鈹€ ParentCenter/  # 瀹堕暱涓績
鈹?  鈹?  鈹溾攢鈹€ shared/        # 鍏变韩缁勪欢 & 宸ュ叿
鈹?  鈹?  鈹斺攢鈹€ contexts/      # React Context
鈹?  鈹斺攢鈹€ public/            # 闈欐€佽祫婧愶紙鍥剧墖銆侀煶棰戙€佽棰戯級
鈹溾攢鈹€ server/                # 鍚庣 Express 鏈嶅姟
鈹?  鈹溾攢鈹€ src/
鈹?  鈹?  鈹溾攢鈹€ routes/        # API 璺敱
鈹?  鈹?  鈹溾攢鈹€ controllers/   # 璇锋眰澶勭悊
鈹?  鈹?  鈹溾攢鈹€ services/ai/   # AI 鏈嶅姟锛堟枃鏈€佸浘鐗囥€乀TS锛?鈹?  鈹?  鈹溾攢鈹€ middleware/     # 涓棿浠讹紙璁よ瘉銆侀檺娴侊級
鈹?  鈹?  鈹斺攢鈹€ models/        # 鏁版嵁妯″瀷
鈹?  鈹斺攢鈹€ .env.example       # 鐜鍙橀噺妯℃澘
鈹斺攢鈹€ e2e/                   # E2E 娴嬭瘯
```

## 璁稿彲

MIT
