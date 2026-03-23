import { Link } from "react-router-dom";
import "../site.css";

import { useLanguage } from "../hooks/useLanguage";

function RenderCs() {
  return (
    <>
      <section>
        <h1>Zásady ochrany osobních údajů (GDPR)</h1>
        <p>
          V Sky-travel.tours (provozovatel Irina Terenteva, IČO: 23973099, se sídlem Křižíkova 6, Praha), věnujeme ochraně vašich osobních údajů maximální pozornost. Jako cestovní agentura vystupujeme v roli zprostředkovatele a při nakládání s vašimi údaji se řídíme nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR).
          <br /><br />
          Tento dokument vysvětluje, jaké údaje sbíráme, proč je potřebujeme a komu je předáváme.
        </p>
      </section>

      <section>
        <h2>1. Jaké osobní údaje zpracováváme?</h2>
        <p>Zpracováváme pouze údaje nezbytné pro vyřízení vaší poptávky a uzavření smlouvy o zájezdu:</p>
        <ul>
          <li><strong>Identifikační údaje:</strong> Jméno, příjmení, datum narození, pohlaví a státní občanství. U zájezdů mimo EU také číslo cestovního dokladu a jeho platnost (nezbytné pro víza a nahlášení leteckým dopravcům).</li>
          <li><strong>Kontaktní údaje:</strong> E-mailová adresa, telefonní číslo, adresa trvalého bydliště a případně kontakt na sociálních sítích (Instagram/WhatsApp/Telegram), pokud skrze ně probíhá komunikace.</li>
          <li><strong>Údaje o spolucestujících:</strong> V stejném rozsahu jako u hlavního zákazníka (včetně nezletilých dětí).</li>
          <li><strong>Platební údaje:</strong> Číslo bankovního účtu, údaje o platbách a fakturační údaje.</li>
          <li><strong>Specifické údaje:</strong> Informace o zdravotním stavu (např. hendikep či těhotenství), pokud jsou nezbytné pro zajištění bezpečnosti zájezdu, nebo údaje pro vyřízení pojištění a víz.</li>
        </ul>
      </section>

      <section>
        <h2>2. Proč údaje zpracováváme a co nás k tomu opravňuje?</h2>
        <p>Vaše údaje zpracováváme na základě těchto právních titulů:</p>
        <ul>
          <li><strong>Plnění smlouvy:</strong> Abychom mohli vyřídit vaši rezervaci a zprostředkovat smlouvu o zájezdu s pořádající cestovní kanceláří.</li>
          <li><strong>Plnění právní povinnosti:</strong> Vedení účetnictví, vyřizování reklamací a plnění povinností dle zákona o cestovním ruchu.</li>
          <li><strong>Oprávněný zájem:</strong> Ochrana našich právních nároků a základní komunikace se zákazníky.</li>
          <li><strong>Souhlas:</strong> Pro zasílání marketingových nabídek a newsletterů (pokud jste nám jej udělili). Tento souhlas můžete kdykoliv odvolat.</li>
        </ul>
      </section>

      <section>
        <h2>3. Komu údaje předáváme?</h2>
        <p>Jako zprostředkovatel předáváme vaše údaje dalším subjektům (Správcům), bez kterých by nebylo možné zájezd realizovat:</p>
        <ul>
          <li><strong>Pořádající cestovní kanceláři:</strong> Např. Coral Travel s.r.o., Fischer, Čedok a další (podle vybraného zájezdu). Tato CK se stává správcem vašich dat pro účely realizace cesty.</li>
          <li><strong>Poskytovatelům služeb:</strong> Letecké společnosti, hotely, pojišťovny (pro sjednání cestovního pojištění) a vízová centra.</li>
          <li><strong>Technickým partnerům:</strong> Poskytovatelé rezervačních systémů (např. CeSYS/Darkmay) a IT služeb pro provoz webu.</li>
        </ul>
      </section>

      <section>
        <h2>4. Doba uchovávání údajů</h2>
        <ul>
          <li>Údaje pro účely smlouvy uchováváme po dobu trvání smlouvy a dále po dobu 3 let pro případ reklamací (nebo dle zákonných lhůt pro archivaci účetních dokladů – až 10 let).</li>
          <li>Údaje pro marketingové účely uchováváme po dobu 36 měsíců od udělení souhlasu nebo do jeho odvolání.</li>
        </ul>
      </section>

      <section>
        <h2>5. Vaše práva</h2>
        <p>Máte právo nás kdykoliv požádat o:</p>
        <ul>
          <li>Přístup k vašim údajům a informaci, jak je zpracováváme.</li>
          <li>Opravu nepřesných nebo neúplných údajů.</li>
          <li>Výmaz údajů (právo „být zapomenut“), pokud již nejsou potřeba pro účely smlouvy.</li>
          <li>Námitku proti zpracování založeném na našem oprávněném zájmu.</li>
          <li>Přenositelnost údajů k jinému správci.</li>
        </ul>
      </section>

      <section>
        <h2>6. Jak nás kontaktovat?</h2>
        <p>
          Pokud máte jakékoliv dotazy k ochraně vašich dat nebo chcete uplatnit svá práva, kontaktujte nás na:
        </p>
        <ul>
          <li><strong>E-mail:</strong> <a href="mailto:info@skytravel.cz">info@skytravel.cz</a></li>
          <li><strong>Adresa:</strong> Irina Terenteva, Křižíkova 6, Praha</li>
        </ul>
        <p>Vaši žádost vyřídíme bez zbytečného odkladu, nejpozději však do jednoho měsíce.</p>
      </section>
    </>
  );
}

function RenderEn() {
  return (
    <>
      <section>
        <h1>Privacy Policy (GDPR)</h1>
        <p>
          At Sky-travel.tours (operated by Irina Terenteva, ID: 23973099, based in Křižíkova 6, Prague), we pay maximum attention to the protection of your personal data. As a travel agency, we act as an intermediary and handle your data in accordance with the Regulation of the European Parliament and of the Council (EU) 2016/679 (GDPR).
          <br /><br />
          This document explains what data we collect, why we need it, and to whom we transfer it.
        </p>
      </section>

      <section>
        <h2>1. What personal data do we process?</h2>
        <p>We process only the data necessary to handle your inquiry and conclude a travel contract:</p>
        <ul>
          <li><strong>Identification data:</strong> Name, surname, date of birth, gender, and nationality. For trips outside the EU, also the travel document number and its validity (necessary for visas and reporting to airlines).</li>
          <li><strong>Contact data:</strong> E-mail address, telephone number, address of permanent residence, and possibly contact on social networks (Instagram/WhatsApp/Telegram) if communication takes place through them.</li>
          <li><strong>Data of fellow travelers:</strong> To the same extent as for the main customer (including minor children).</li>
          <li><strong>Payment data:</strong> Bank account number, payment details, and billing information.</li>
          <li><strong>Specific data:</strong> Information about health status (e.g., handicap or pregnancy), if necessary to ensure the safety of the tour, or data for processing insurance and visas.</li>
        </ul>
      </section>

      <section>
        <h2>2. Why do we process data and what entitles us to do so?</h2>
        <p>We process your data on the basis of these legal titles:</p>
        <ul>
          <li><strong>Performance of a contract:</strong> So that we can process your reservation and mediate a travel contract with the organizing travel agency.</li>
          <li><strong>Compliance with a legal obligation:</strong> Accounting, handling complaints, and fulfilling obligations under the Tourism Act.</li>
          <li><strong>Legitimate interest:</strong> Protection of our legal claims and basic communication with customers.</li>
          <li><strong>Consent:</strong> For sending marketing offers and newsletters (if you granted it to us). You can withdraw this consent at any time.</li>
        </ul>
      </section>

      <section>
        <h2>3. To whom do we transfer the data?</h2>
        <p>As an intermediary, we transfer your data to other entities (Controllers) without which it would not be possible to realize the tour:</p>
        <ul>
          <li><strong>Organizing travel agencies:</strong> E.g., Coral Travel s.r.o., Fischer, Čedok, and others (according to the selected tour). This travel agency becomes the controller of your data for the purpose of realizing the trip.</li>
          <li><strong>Service providers:</strong> Airlines, hotels, insurance companies (for arranging travel insurance), and visa centers.</li>
          <li><strong>Technical partners:</strong> Providers of reservation systems (e.g., CeSYS/Darkmay) and IT services for the operation of the website.</li>
        </ul>
      </section>

      <section>
        <h2>4. Data retention period</h2>
        <ul>
          <li>We keep data for the purpose of the contract for the duration of the contract and then for 3 years in case of complaints (or according to the legal periods for archiving accounting documents – up to 10 years).</li>
          <li>We keep data for marketing purposes for 36 months from the granting of consent or until its withdrawal.</li>
        </ul>
      </section>

      <section>
        <h2>5. Your rights</h2>
        <p>You have the right to ask us at any time for:</p>
        <ul>
          <li>Access to your data and information on how we process it.</li>
          <li>Correction of inaccurate or incomplete data.</li>
          <li>Erasure of data (right "to be forgotten") if no longer needed for the purposes of the contract.</li>
          <li>Objection against processing based on our legitimate interest.</li>
          <li>Data portability to another controller.</li>
        </ul>
      </section>

      <section>
        <h2>6. How to contact us?</h2>
        <p>
          If you have any questions about the protection of your data or want to exercise your rights, contact us at:
        </p>
        <ul>
          <li><strong>E-mail:</strong> <a href="mailto:info@skytravel.cz">info@skytravel.cz</a></li>
          <li><strong>Address:</strong> Irina Terenteva, Křižíkova 6, Prague</li>
        </ul>
        <p>We will handle your request without undue delay, but no later than within one month.</p>
      </section>
    </>
  );
}

function RenderUk() {
  return (
    <>
      <section>
        <h1>Політика конфіденційності (GDPR)</h1>
        <p>
          У Sky-travel.tours (оператор Ірина Терентьєва, IČO: 23973099, юридична адреса: Křižíkova 6, Прага) ми приділяємо максимальну увагу захисту ваших персональних даних. Як туристичне агентство ми діємо як посередник і обробляємо ваші дані відповідно до Регламенту Європейського Парламенту та Ради (ЄС) 2016/679 (GDPR).
          <br /><br />
          Цей документ пояснює, які дані ми збираємо, навіщо вони нам потрібні та кому ми їх передаємо.
        </p>
      </section>

      <section>
        <h2>1. Які персональні дані ми обробляємо?</h2>
        <p>Ми обробляємо лише дані, необхідні для опрацювання вашого запиту та укладення договору про туристичне обслуговування:</p>
        <ul>
          <li><strong>Ідентифікаційні дані:</strong> Ім'я, прізвище, дата народження, стать та громадянство. Для поїздок за межі ЄС також номер проїзного документа та термін його дії (що необхідно для віз і звітування перед авіакомпаніями).</li>
          <li><strong>Контактні дані:</strong> Електронна адреса, номер телефону, адреса постійного проживання та, за необхідності, контакт у соціальних мережах (Instagram/WhatsApp/Telegram), якщо спілкування відбувається через них.</li>
          <li><strong>Дані попутників:</strong> В тому ж обсязі, що й для головного клієнта (включаючи неповнолітніх дітей).</li>
          <li><strong>Платіжні дані:</strong> Номер банківського рахунку, деталі платежу та платіжна інформація.</li>
          <li><strong>Специфічні дані:</strong> Інформація про стан здоров'я (наприклад, інвалідність або вагітність), якщо це необхідно для забезпечення безпеки туру, або дані для оформлення страховки та віз.</li>
        </ul>
      </section>

      <section>
        <h2>2. Чому ми обробляємо дані і що дає нам на це право?</h2>
        <p>Ми обробляємо ваші дані на підставі таких правових норм:</p>
        <ul>
          <li><strong>Виконання договору:</strong> Щоб ми могли обробити ваше бронювання і бути посередником у договорі з туристичним оператором.</li>
          <li><strong>Виконання юридических зобов'язань:</strong> Бухгалтерський облік, розгляд скарг та виконання зобов'язань за Законом про туризм.</li>
          <li><strong>Законний інтерес:</strong> Захист наших правових претензій та базове спілкування з клієнтами.</li>
          <li><strong>Згода:</strong> Для розсилки маркетингових пропозицій та новин (якщо ви дали її нам). Ви можете відкликати цю згоду в будь-який час.</li>
        </ul>
      </section>

      <section>
        <h2>3. Кому ми передаємо дані?</h2>
        <p>Як посередник ми передаємо ваші дані іншим суб'єктам (Контролерам), без яких було б неможливо здійснити тур:</p>
        <ul>
          <li><strong>Організатору (туроператору):</strong> Наприклад, Coral Travel s.r.o., Fischer, Čedok та інші (залежно від обраного туру). Цей ТО стає контролером ваших даних для цілей реалізації подорожі.</li>
          <li><strong>Постачальникам послуг:</strong> Авіакомпанії, готелі, страхові компанії (для оформлення туристичної страховки) та візові центри.</li>
          <li><strong>Технічним партнерам:</strong> Провайдери систем бронювання (наприклад, CeSYS/Darkmay) та ІТ-послуг для роботи сайту.</li>
        </ul>
      </section>

      <section>
        <h2>4. Термін зберігання даних</h2>
        <ul>
          <li>Ми зберігаємо дані для цілей договору протягом терміну дії договору, а потім протягом 3 років на випадок скарг (або відповідно до встановлених законом термінів для архівування бухгалтерських документів - до 10 років).</li>
          <li>Ми зберігаємо дані для маркетингових цілей протягом 36 місяців з моменту надання згоди або до її відкликання.</li>
        </ul>
      </section>

      <section>
        <h2>5. Ваші права</h2>
        <p>Ви маєте право у будь-який час вимагати від нас:</p>
        <ul>
          <li>Доступ до ваших даних та інформації про те, як ми їх обробляємо.</li>
          <li>Виправлення неточних або неповних даних.</li>
          <li>Видалення даних (право «бути забутим»), якщо вони більше не потрібні для цілей договору.</li>
          <li>Заперечення проти обробки на підставі нашого законного інтересу.</li>
          <li>Перенесення даних іншому контролеру.</li>
        </ul>
      </section>

      <section>
        <h2>6. Як зв'язатися з нами?</h2>
        <p>
          Якщо у вас виникли питання щодо захисту ваших даних або ви хочете реалізувати свої права, зв'яжіться з нами за адресою:
        </p>
        <ul>
          <li><strong>E-mail:</strong> <a href="mailto:info@skytravel.cz">info@skytravel.cz</a></li>
          <li><strong>Адреса:</strong> Irina Terenteva, Křižíkova 6, Praha</li>
        </ul>
        <p>Ми обробимо ваш запит без невиправданої затримки, але не пізніше ніж протягом одного місяця.</p>
      </section>
    </>
  );
}

function RenderRu() {
  return (
    <>
      <section>
        <h1>Политика конфиденциальности (GDPR)</h1>
        <p>
          В Sky-travel.tours (оператор Ирина Терентьева, IČO: 23973099, юридический адрес: Křižíkova 6, Прага) мы уделяем максимальное внимание защите ваших персональных данных. Как туристическое агентство мы выступаем в роли посредника и обрабатываем ваши данные в соответствии с Регламентом Европейского Парламента и Совета (ЕС) 2016/679 (GDPR).
          <br /><br />
          Этот документ объясняет, какие данные мы собираем, зачем они нам нужны и кому мы их передаем.
        </p>
      </section>

      <section>
        <h2>1. Какие персональные данные мы обрабатываем?</h2>
        <p>Мы обрабатываем только данные, необходимые для обработки вашего запроса и заключения договора о туристическом обслуживании:</p>
        <ul>
          <li><strong>Идентификационные данные:</strong> Имя, фамилия, дата рождения, пол и гражданство. Для поездок за пределы ЕС также номер проездного документа и срок его действия (что необходимо для виз и отчетности перед авиакомпаниями).</li>
          <li><strong>Контактные данные:</strong> Электронная почта, номер телефона, адрес постоянного проживания и, при необходимости, контакт в социальных сетях (Instagram/WhatsApp/Telegram), если общение происходит через них.</li>
          <li><strong>Данные попутчиков:</strong> В том же объеме, что и для главного клиента (включая несовершеннолетних детей).</li>
          <li><strong>Платежные данные:</strong> Номер банковского счета, детали платежа и платежная информация.</li>
          <li><strong>Специфические данные:</strong> Информация о состоянии здоровья (например, инвалидность или беременность), если это необходимо для обеспечения безопасности тура, или данные для оформления страховки и виз.</li>
        </ul>
      </section>

      <section>
        <h2>2. Почему мы обрабатываем данные и что дает нам на это право?</h2>
        <p>Мы обрабатываем ваши данные на основании следующих правовых норм:</p>
        <ul>
          <li><strong>Исполнение договора:</strong> Чтобы мы могли обработать ваше бронирование и быть посредником в договоре с туристическим оператором.</li>
          <li><strong>Выполнение юридических обязательств:</strong> Бухгалтерский учет, рассмотрение жалоб и выполнение обязательств по Законом о туризме.</li>
          <li><strong>Законный интерес:</strong> Защита наших правовых претензий и базовое общение с клиентами.</li>
          <li><strong>Согласие:</strong> Для рассылки маркетинговых предложений и новостей (если вы дали его нам). Вы можете отозвать согласие в любое время.</li>
        </ul>
      </section>

      <section>
        <h2>3. Кому мы передаем данные?</h2>
        <p>Как посредник мы передаем ваши данные другим субъектам (Контролерам), без которых было бы невозможно осуществить тур:</p>
        <ul>
          <li><strong>Организатору (туроператору):</strong> Например, Coral Travel s.r.o., Fischer, Čedok и другие (в зависимости от выбранного тура). Этот ТО становится контролером ваших данных для целей реализации поездки.</li>
          <li><strong>Поставщикам услуг:</strong> Авиакомпании, отели, страховые компании (для оформления туристической страховки) и визовые центры.</li>
          <li><strong>Техническим партнерам:</strong> Провайдеры систем бронирования (например, CeSYS/Darkmay) и ИТ-услуг для работы сайта.</li>
        </ul>
      </section>

      <section>
        <h2>4. Срок хранения данных</h2>
        <ul>
          <li>Мы храним данные для целей договора в течение срока действия договора, а затем в течение 3 лет на случай жалоб (или в соответствии с установленными законом сроками для архивирования бухгалтерских документов - до 10 лет).</li>
          <li>Мы храним данные для маркетинговых целей в течение 36 месяцев с момента предоставления согласия или до его отзыва.</li>
        </ul>
      </section>

      <section>
        <h2>5. Ваши права</h2>
        <p>Вы имеете право в любое время потребовать от нас:</p>
        <ul>
          <li>Доступ к вашим данным и информации о том, как мы их обрабатываем.</li>
          <li>Исправление неточных или неполных данных.</li>
          <li>Удаление данных (право «быть забытым»), если они больше не нужны для целей договора.</li>
          <li>Возражение против обработки на основании нашего законного интереса.</li>
          <li>Перенос данных другому контролеру.</li>
        </ul>
      </section>

      <section>
        <h2>6. Как связаться с нами?</h2>
        <p>
          Если у вас возникли вопросы по защите ваших данных или вы хотите реализовать свои права, свяжитесь с нами по адресу:
        </p>
        <ul>
          <li><strong>E-mail:</strong> <a href="mailto:info@skytravel.cz">info@skytravel.cz</a></li>
          <li><strong>Адреса:</strong> Irina Terenteva, Křižíkova 6, Praha</li>
        </ul>
        <p>Мы обработаем ваш запрос без неоправданной задержки, но не позднее чем в течение одного месяца.</p>
      </section>
    </>
  );
}

export default function GdprPage() {
  const { lang, t } = useLanguage();

  return (
    <main className="gdpr-page">
      <div className="gdpr-card">
        <header className="gdpr-header">
          <Link to="/" className="logo">
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </Link>
          <p>{t("footerGdpr")}</p>
        </header>

        {lang === "en" && <RenderEn />}
        {lang === "uk" && <RenderUk />}
        {lang === "ru" && <RenderRu />}
        {lang === "cs" && <RenderCs />}

        <footer className="gdpr-footer">
          <Link to="/">{t("navContact") === "Kontakt" ? "Zpět na web" : "Back to web"}</Link>
        </footer>
      </div>
    </main>
  );
}
