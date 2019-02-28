# Opendata 文字雲後端

#### 之前寫的太爛了，找時間要重構，看都看不懂。但是下禮拜二要交子賢的報告，下禮拜二後我再把完整API 寫完 இдஇ



## 目前有的API
*  **GET**  /get_wordcloud_dict?county="縣市" 
回傳該縣市所有資料集的分詞結果與數量**字典檔**
    EX:{"政府":12,"臺北":58,....} 
    其中縣市必須為繁體三個字 EX: 臺北市、南投縣。不傳入參數默認為全台縣市

* **GET** /get_relateKey?keyword="" 
回傳與該字關聯性最強的四個詞彙 EX: 傳入"北市" 回傳 ["捷運","系統","資料","市立"]

* **POST** /get_smallcloud params={keyword,frontNumber} 
回傳該傳入keyword的關聯文字雲。 EX: 傳入"北市" 回傳 ["捷運","系統","資料","市立"] 的文字雲字典檔，frontNumber為該文字雲大小，fontNumber = 10 傳回捷運、系統、資料、市立 最大的十筆字典檔

* **GET** /search_data?keyword=""
回傳資料庫原始資料，EX : "北市" 回傳所有title包含北市的資料，資料欄位詳見:[這裡](https://github.com/lufor129/TaiwanOpenDataSet) 

* 之後更新....