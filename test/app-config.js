(() => {
'use strict';
const DEFAULT_SHEET_URL = ''; // VD: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit'
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const STORAGE_SHEET_KEY = 'jlpt_sheet_url_v2';

const SAMPLE_DATASET = {
  meta: { title: 'JLPT Vocabulary (Mẫu từ Sheet)', version: '3.0' },
  words: [
    { id: 'N5_001', level: 'N5', kanji: '', kana: 'おはよう', furigana: 'おはよう', romaji: 'ohayou', hanViet: '', meaning: 'Chào buổi sáng (thân mật; lịch sự: おはようございます)', pos: 'Thán từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'おはよう。今日もいい天気だね。', romaji: 'Ohayou. Kyou mo ii tenki da ne.', vi: 'Chào buổi sáng. Hôm nay trời cũng đẹp nhỉ.' } },
    { id: 'N5_002', level: 'N5', kanji: '', kana: 'こんにちは', furigana: 'こんにちは', romaji: 'konnichiwa', hanViet: '', meaning: 'Xin chào (buổi trưa, chiều)', pos: 'Thán từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'こんにちは、やまださん。お元気ですか。', romaji: 'Konnichiwa, Yamada-san. Ogenki desu ka.', vi: 'Xin chào anh/chị Yamada. Anh/chị có khỏe không?' } },
    { id: 'N5_009', level: 'N5', kanji: '', kana: 'すみません', furigana: 'すみません', romaji: 'sumimasen', hanViet: '', meaning: 'Xin lỗi; cho tôi hỏi / làm phiền một chút', pos: 'Cụm từ cố định', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'すみません、駅はどこですか。', romaji: 'Sumimasen, eki wa doko desu ka.', vi: 'Xin lỗi, cho tôi hỏi nhà ga ở đâu ạ?' } },
    { id: 'N5_011', level: 'N5', kanji: 'お願いします', kana: 'おねがいします', furigana: 'お願[ねが]いします', romaji: 'onegaishimasu', hanViet: 'NGUYỆN', meaning: 'Làm ơn; xin nhờ anh/chị; cho tôi gọi (món)', pos: 'Cụm từ cố định', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'コーヒーを一つお願いします。', romaji: 'Koohii o hitotsu onegaishimasu.', vi: 'Cho tôi một ly cà phê ạ.' } },
    { id: 'N5_020', level: 'N5', kanji: '私', kana: 'わたくし', furigana: '私[わたくし]', romaji: 'watakushi', hanViet: 'TƯ', meaning: 'Tôi (cách xưng trang trọng, khiêm nhường của わたし)', pos: 'Đại từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '私は大学の学生です。', romaji: 'Watakushi wa daigaku no gakusei desu.', vi: 'Tôi là sinh viên đại học.' } },
    { id: 'N5_022', level: 'N5', kanji: '自分', kana: 'じぶん', furigana: '自[じ]分[ぶん]', romaji: 'jibun', hanViet: 'TỰ PHÂN', meaning: 'Bản thân, tự mình', pos: 'Đại từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '朝ごはんは自分で作ります。', romaji: 'Asagohan wa jibun de tsukurimasu.', vi: 'Bữa sáng tôi tự làm lấy.' } },
    { id: 'N5_049', level: 'N5', kanji: '名前', kana: 'なまえ', furigana: '名[な]前[まえ]', romaji: 'namae', hanViet: 'DANH TIỀN', meaning: 'Tên, họ tên', pos: 'Danh từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'ここにお名前を書いてください。', romaji: 'Koko ni onamae o kaite kudasai.', vi: 'Xin vui lòng viết tên của anh/chị vào đây.' } },
    { id: 'N5_050', level: 'N5', kanji: '番号', kana: 'ばんごう', furigana: '番[ばん]号[ごう]', romaji: 'bangou', hanViet: 'PHIÊN HIỆU', meaning: 'Số, số hiệu (số điện thoại, số phòng...)', pos: 'Danh từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '電話番号を教えてください。', romaji: 'Denwa bangou o oshiete kudasai.', vi: 'Cho tôi xin số điện thoại của bạn nhé.' } },
    { id: 'N5_051', level: 'N5', kanji: '言葉', kana: 'ことば', furigana: '言[こと]葉[ば]', romaji: 'kotoba', hanViet: 'NGÔN DIỆP', meaning: 'Từ ngữ, ngôn ngữ, lời nói', pos: 'Danh từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '新しい言葉を毎日覚えます。', romaji: 'Atarashii kotoba o mainichi oboemasu.', vi: 'Mỗi ngày tôi đều học thuộc từ mới.' } },
    { id: 'N5_052', level: 'N5', kanji: '意味', kana: 'いみ', furigana: '意[い]味[み]', romaji: 'imi', hanViet: 'Ý VỊ', meaning: 'Ý nghĩa, nghĩa', pos: 'Danh từ / Động từ nhóm III', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'この漢字の意味が分かりません。', romaji: 'Kono kanji no imi ga wakarimasen.', vi: 'Tôi không hiểu nghĩa của chữ Kanji này.' } },
    { id: 'N4_001', level: 'N4', kanji: '食事', kana: 'しょくじ', furigana: '食[しょく]事[じ]', romaji: 'shokuji', hanViet: 'THỰC SỰ', meaning: 'Bữa ăn, dùng bữa', pos: 'Danh từ / Động từ', topic: 'Ẩm thực', example: { ja: '家族と食事をします。', romaji: 'Kazoku to shokuji o shimasu.', vi: 'Tôi dùng bữa cùng gia đình.' } },
    { id: 'N4_002', level: 'N4', kanji: '旅行', kana: 'りょこう', furigana: '旅[りょ]行[こう]', romaji: 'ryokou', hanViet: 'LỮ HÀNH', meaning: 'Du lịch', pos: 'Danh từ / Động từ', topic: 'Di chuyển', example: { ja: '日本へ旅行に行きます。', romaji: 'Nihon e ryokou ni ikimasu.', vi: 'Tôi đi du lịch đến Nhật Bản.' } },
    { id: 'N3_001', level: 'N3', kanji: '発見', kana: 'はっけん', furigana: '発[はっ]見[けん]', romaji: 'hakken', hanViet: 'PHÁT KIẾN', meaning: 'Phát hiện', pos: 'Danh từ / Động từ', topic: 'Học tập', example: { ja: '新しい星を発見しました。', romaji: 'Atarashii hoshi o hakken shimashita.', vi: 'Đã phát hiện ra một ngôi sao mới.' } }
  ]
};

const BUILTIN_MINI_DICT = {
  'は': { reading: 'わ (wa)', meaning: 'Trợ từ chủ đề câu', note: 'Đứng sau chủ ngữ/chủ đề' },
  'が': { reading: 'が (ga)', meaning: 'Trợ từ chủ ngữ / nhấn mạnh đối tượng', note: 'Hoặc nghĩa "nhưng" khi nối câu' },
  'を': { reading: 'を (o)', meaning: 'Trợ từ tân ngữ trực tiếp', note: 'Đứng sau đối tượng chịu tác động' },
  'に': { reading: 'に (ni)', meaning: 'Vào, ở, đến, cho (thời gian/đích đến)', note: 'Trợ từ chỉ thời gian, địa điểm, mục đích' },
  'で': { reading: 'で (de)', meaning: 'Tại, bằng (nơi diễn ra / phương tiện)', note: 'Trợ từ chỉ nơi hành động hoặc cách thức' },
  'へ': { reading: 'へ (e)', meaning: 'Hướng về, đến (địa điểm)', note: 'Trợ từ chỉ phương hướng' },
  'と': { reading: 'と (to)', meaning: 'Và / Cùng với', note: 'Trợ từ liệt kê hoặc đồng hành' },
  'の': { reading: 'の (no)', meaning: 'Của (sở hữu / bổ nghĩa)', note: 'Nối hai danh từ' },
  'も': { reading: 'も (mo)', meaning: 'Cũng', note: 'Trợ từ tương đồng' },
  'か': { reading: 'か (ka)', meaning: 'Không? (trợ từ nghi vấn)', note: 'Đặt cuối câu để hỏi' },
  'ね': { reading: 'ね (ne)', meaning: 'Nhỉ, nhé (xác nhận, đồng cảm)', note: 'Trợ từ cuối câu' },
  'よ': { reading: 'よ (yo)', meaning: 'Đấy, nhé (nhấn mạnh thông tin mới)', note: 'Trợ từ cuối câu' },
  'です': { reading: 'です', meaning: 'Là (lịch sự)', note: 'Hệ từ lịch sự cuối câu' },
  'ます': { reading: 'ます', meaning: 'Đuôi động từ thể lịch sự', note: 'Thì hiện tại / tương lai' },
  'ください': { reading: 'ください', meaning: 'Xin hãy / Cho tôi xin...', note: 'Cấu trúc yêu cầu lịch sự' },
  '今日': { reading: 'きょう', hanViet: 'KIM NHẬT', meaning: 'Hôm nay', note: 'Danh từ thời gian' },
  '天気': { reading: 'てんき', hanViet: 'THIÊN KHÍ', meaning: 'Thời tiết', note: 'Danh từ' },
  'いい': { reading: 'いい', meaning: 'Tốt, đẹp', note: 'Tính từ đuôi い' },
  '駅': { reading: 'えき', hanViet: 'DỊCH', meaning: 'Nhà ga', note: 'Danh từ địa điểm' },
  'どこ': { reading: 'どこ', meaning: 'Ở đâu', note: 'Đại từ nghi vấn' },
  '大学': { reading: 'だいがく', hanViet: 'ĐẠI HỌC', meaning: 'Trường đại học', note: 'Danh từ' },
  '学生': { reading: 'がくせい', hanViet: 'HỌC SINH', meaning: 'Học sinh, sinh viên', note: 'Danh từ' },
  '朝ごはん': { reading: 'あさごはん', meaning: 'Bữa sáng', note: 'Danh từ' },
  '作ります': { reading: 'つくります', hanViet: 'TÁC', meaning: 'Làm, nấu, chế tạo', note: 'Thể ます của 作る' },
  'ここ': { reading: 'ここ', meaning: 'Ở đây, chỗ này', note: 'Đại từ chỉ định' },
  '書いて': { reading: 'かいて', hanViet: 'THƯ', meaning: 'Viết (thể て)', note: 'Từ động từ 書く' },
  '電話': { reading: 'でんわ', hanViet: 'ĐIỆN THOẠI', meaning: 'Điện thoại', note: 'Danh từ' },
  '教えて': { reading: 'おしえて', hanViet: 'GIÁO', meaning: 'Chỉ cho, nói cho biết (thể て)', note: 'Từ động từ 教える' },
  '新しい': { reading: 'あたらしい', hanViet: 'TÂN', meaning: 'Mới', note: 'Tính từ đuôi い' },
  '毎日': { reading: 'まいにち', hanViet: 'MỖI NHẬT', meaning: 'Mỗi ngày', note: 'Danh từ thời gian' },
  '覚えます': { reading: 'おぼえます', hanViet: 'GIÁC', meaning: 'Nhớ, học thuộc', note: 'Thể ます của 覚える' },
  'この': { reading: 'この', meaning: '...này', note: 'Đứng trước danh từ' },
  '漢字': { reading: 'かんじ', hanViet: 'HÁN TỰ', meaning: 'Chữ Hán (Kanji)', note: 'Danh từ' },
  '分かりません': { reading: 'わかりません', hanViet: 'PHÂN', meaning: 'Không hiểu, không biết', note: 'Phủ định lịch sự của 分かる' },
  'コーヒー': { reading: 'こーひー', meaning: 'Cà phê', note: 'Từ mượn (Katakana)' },
  '一つ': { reading: 'ひとつ', hanViet: 'NHẤT', meaning: 'Một cái', note: 'Số đếm đồ vật' },
  '元気': { reading: 'げんき', hanViet: 'NGUYÊN KHÍ', meaning: 'Khỏe mạnh, năng lượng', note: 'Tính từ đuôi な' },
  '家族': { reading: 'かぞく', hanViet: 'GIA TỘC', meaning: 'Gia đình', note: 'Danh từ' },
  '日本': { reading: 'にほん', hanViet: 'NHẬT BẢN', meaning: 'Nhật Bản', note: 'Danh từ riêng' },
  '星': { reading: 'ほし', hanViet: 'TINH', meaning: 'Ngôi sao', note: 'Danh từ' }
};


window.KawaiiAppConfig = Object.freeze({DEFAULT_SHEET_URL, LEVELS: Object.freeze(LEVELS), STORAGE_SHEET_KEY, SAMPLE_DATASET, BUILTIN_MINI_DICT});
})();
