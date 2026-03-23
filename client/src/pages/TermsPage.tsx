import { Link } from "react-router-dom";
import "../site.css";

import { useLanguage } from "../hooks/useLanguage";

function RenderCs() {
  return (
    <>
      <section>
        <h1>Obchodní podmínky cestovní agentury</h1>
        <p>Sky-travel.tours</p>
      </section>

      <section>
        <h2>I. ÚVODNÍ USTANOVENÍ</h2>
        <ol>
          <li>
            Cestovní agentura Sky-travel.tours, provozovaná živnostníkem Irinou Terentevou, IČO: 23973099 (dále jen „CA“), je autorizovaným prodejcem zájezdů a služeb cestovního ruchu pořádaných českými i zahraničními cestovními kancelářemi (dále jen „Pořadatel“).
          </li>
          <li>
            Činnost CA je vykonávána na základě řádných smluv o obchodním zastoupení uzavřených s jednotlivými Pořadateli (např. Coral Travel s.r.o.).
          </li>
          <li>
            CA není pořadatelem zájezdů; smluvní vztah vzniká přímo mezi zákazníkem a Pořadatelem zájezdu. Tento vztah se řídí Všeobecnými smluvními podmínkami (VOP) zvoleného Pořadatele.
          </li>
          <li>
            Nabídka zájezdů je pravidelně aktualizována na základě dat z rezervačních systémů Pořadatelů. CA garantuje stejné ceny a nárok na stejné slevy (First Minute, Last Minute) jako pořádající Pořadatel.
          </li>
        </ol>
      </section>

      <section>
        <h2>II. OBJEDNÁVKY A REZERVACE</h2>
        <ol>
          <li>Zákazník může zaslat poptávku po zájezdu prostřednictvím webových stránek, sociálních sítí (Instagram) nebo osobní komunikace (WhatsApp, Telegram).</li>
          <li>Přijatá poptávka je nezávazná. CA ověří dostupnost a cenu v systému Pořadatele a následně vytvoří opční rezervaci.</li>
          <li>Opční rezervace je časově omezená dle pravidel Pořadatele (např. u zájezdů 1–3 dny před odletem může trvat pouze 1 hodinu).</li>
          <li>CA si vyhrazuje právo odmítnout objednávky s chybnými údaji nebo opakovaně neuhrazené rezervace.</li>
        </ol>
      </section>

      <section>
        <h2>III. CESTOVNÍ SMLOUVA (SMLOUVA O ZÁJEZDU)</h2>
        <ol>
          <li>Po potvrzení kalkulace zašle CA zákazníkovi návrh smlouvy o zájezdu (jménem Pořadatele), VOP Pořadatele, doklad o pojištění proti úpadku, reklamační řád a standardizovaný formulář s informacemi k zájezdu.</li>
          <li>Smlouva se stává závaznou okamžikem jejího potvrzení ze strany Pořadatele.</li>
          <li>Zákazník odpovídá za správnost všech jím uvedených údajů v cestovní smlouvě (včetně jmen dle cestovních dokladů a státního občanství).</li>
        </ol>
      </section>

      <section>
        <h2>IV. PLATEBNÍ PODMÍNKY</h2>
        <ol>
          <li>Závazná cena je uvedena na smlouvě o zájezdu. Platební kalendář (zálohy a doplatky) se řídí podmínkami Pořadatele.</li>
          <li>Platby jsou poukazovány přímo na účet Pořadatele, nebo na účet CA. V případě úhrady na účet CA je tato platba neprodleně (nejpozději následující pracovní den) převedena Pořadateli.</li>
          <li>Jakákoliv platba se považuje za uhrazenou až v okamžiku připsání částky na účet příjemce. CA neodpovídá za následky způsobené prodlením platby ze strany zákazníka.</li>
        </ol>
      </section>

      <section>
        <h2>V. CESTOVNÍ DOKLADY A ODBAVENÍ</h2>
        <ol>
          <li>Bez úplného uhrazení ceny zájezdu zákazník neobdrží potřebné odbavovací doklady (vouchery, letenky).</li>
          <li>Cestovní pokyny jsou zpravidla k dispozici v elektronické formě 7 dní před zahájením zájezdu. U Last Minute nabídek jsou předány ihned po potvrzení rezervace a platby.</li>
        </ol>
      </section>

      <section>
        <h2>VI. ZRUŠENÍ ZÁJEZDU (STORNO)</h2>
        <ol>
          <li>Zákazník může od smlouvy odstoupit (stornovat zájezd) kdykoliv před jejím zahájením. Odstoupení musí být zasláno CA písemně (e-mailem).</li>
          <li>Storno poplatky jsou účtovány dle VOP pořádajícího Pořadatele. CA je povinna informovat Pořadatele o stornu do 24 hodin od přijetí požadavku od klienta.</li>
        </ol>
      </section>

      <section>
        <h2>VII. REKLAMACE</h2>
        <ol>
          <li>Za řádné poskytnutí služeb odpovídá pořádající Pořadatel. CA není oprávněna reklamace jménem Pořadatele vyřizovat ani o nich rozhodovat.</li>
          <li>Zákazník uplatňuje reklamaci u Pořadatele, případně ji může podat prostřednictvím CA. CA postoupí řádně podanou reklamaci Pořadateli bezodkladně, nejpozději do 24 hodin.</li>
        </ol>
      </section>

      <section>
        <h2>VIII. OCHRANA OSOBNÍCH ÚDAJŮ (GDPR)</h2>
        <ol>
          <li>CA zpracovává osobní údaje zákazníků v souladu s nařízením GDPR.</li>
          <li>CA vystupuje jako zpracovatel; osobní údaje jsou v nezbytném rozsahu předávány Pořadateli zájezdu jako správci za účelem plnění smlouvy o zájezdu.</li>
          <li>Podrobné zásady ochrany osobních údajů jsou k dispozici na webu Sky-travel.tours.</li>
        </ol>
      </section>
    </>
  );
}

function RenderEn() {
  return (
    <>
      <section>
        <h1>Terms and Conditions of the Travel Agency</h1>
        <p>Sky-travel.tours</p>
      </section>

      <section>
        <h2>I. INTRODUCTORY PROVISIONS</h2>
        <ol>
          <li>
            The travel agency Sky-travel.tours, operated by the entrepreneur Irina Terenteva, ID: 23973099 (hereinafter referred to as the "TA"), is an authorized seller of tours and tourism services organized by Czech and foreign travel agencies (hereinafter referred to as the "Organizer").
          </li>
          <li>
            The activities of the TA are carried out on the basis of proper commercial representation contracts concluded with individual Organizers (e.g., Coral Travel s.r.o.).
          </li>
          <li>
            The TA is not a tour organizer; the contractual relationship arises directly between the customer and the Tour Organizer. This relationship is subject to the General Terms and Conditions (GTC) of the selected Organizer.
          </li>
          <li>
            The offer of tours is regularly updated based on data from the Organizers' reservation systems. The TA guarantees the same prices and entitlement to the same discounts (First Minute, Last Minute) as the organizing Tour Operator.
          </li>
        </ol>
      </section>

      <section>
        <h2>II. ORDERS AND RESERVATIONS</h2>
        <ol>
          <li>The customer can send a request for a tour via the website, social networks (Instagram), or personal communication (WhatsApp, Telegram).</li>
          <li>The received request is non-binding. The TA will check availability and price in the Organizer's system and then create an option reservation.</li>
          <li>The option reservation is time-limited according to the Organizer's rules (e.g., for tours 1–3 days before departure, it may last only 1 hour).</li>
          <li>The TA reserves the right to reject orders with incorrect data or repeatedly unpaid reservations.</li>
        </ol>
      </section>

      <section>
        <h2>III. TRAVEL CONTRACT (TOUR CONTRACT)</h2>
        <ol>
          <li>After confirming the calculation, the TA will send the customer a draft travel contract (on behalf of the Organizer), the Organizer's GTC, proof of insurance against bankruptcy, complaints procedure, and a standardized form with information about the tour.</li>
          <li>The contract becomes binding upon its confirmation by the Organizer.</li>
          <li>The customer is responsible for the accuracy of all data provided in the travel contract (including names according to travel documents and citizenship).</li>
        </ol>
      </section>

      <section>
        <h2>IV. PAYMENT TERMS</h2>
        <ol>
          <li>The binding price is stated on the travel contract. The payment schedule (deposits and surcharges) is governed by the conditions of the Organizer.</li>
          <li>Payments are remitted directly to the Organizer's account or the TA's account. In the case of payment to the TA's account, this payment is immediately (no later than the following working day) transferred to the Organizer.</li>
          <li>Any payment is considered paid only when the amount is credited to the recipient's account. The TA is not liable for consequences caused by a delay in payment by the customer.</li>
        </ol>
      </section>

      <section>
        <h2>V. TRAVEL DOCUMENTS AND CLEARANCE</h2>
        <ol>
          <li>Without full payment of the tour price, the customer will not receive the necessary clearance documents (vouchers, tickets).</li>
          <li>Travel instructions are generally available in electronic form 7 days before the start of the tour. For Last Minute offers, they are handed over immediately after confirming the reservation and payment.</li>
        </ol>
      </section>

      <section>
        <h2>VI. TOUR CANCELLATION (STORNO)</h2>
        <ol>
          <li>The customer may withdraw from the contract (cancel the tour) at any time before its start. The withdrawal must be sent to the TA in writing (by email).</li>
          <li>Cancellation fees are charged according to the GTC of the organizing Tour Operator. The TA is obliged to inform the Organizer of the cancellation within 24 hours of receiving the request from the client.</li>
        </ol>
      </section>

      <section>
        <h2>VII. COMPLAINTS</h2>
        <ol>
          <li>The organizing Tour Operator is responsible for the proper provision of services. The TA is not authorized to handle or decide on complaints on behalf of the Organizer.</li>
          <li>The customer files a complaint with the Organizer, or they can submit it through the TA. The TA will forward a properly filed complaint to the Organizer without delay, at the latest within 24 hours.</li>
        </ol>
      </section>

      <section>
        <h2>VIII. PROTECTION OF PERSONAL DATA (GDPR)</h2>
        <ol>
          <li>The TA processes customers' personal data in accordance with the GDPR regulation.</li>
          <li>The TA acts as a processor; personal data is transferred to the Tour Organizer as the controller to the necessary extent for the purpose of fulfilling the travel contract.</li>
          <li>Detailed privacy principles are available on the Sky-travel.tours website.</li>
        </ol>
      </section>
    </>
  );
}

function RenderUk() {
  return (
    <>
      <section>
        <h1>Умови та Положення туристичного агентства</h1>
        <p>Sky-travel.tours</p>
      </section>

      <section>
        <h2>I. ВСТУПНІ ПОЛОЖЕННЯ</h2>
        <ol>
          <li>
            Туристичне агентство Sky-travel.tours, яким керує підприємець Ірина Терентьєва, IČO: 23973099 (надалі «ТА»), є уповноваженим продавцем турів і туристичних послуг, організованих чеськими та іноземними туристичними операторами (надалі «Організатор»).
          </li>
          <li>
            Діяльність ТА здійснюється на підставі належних договорів комерційного представництва, укладених з окремими Організаторами (наприклад, Coral Travel s.r.o.).
          </li>
          <li>
            ТА не є організатором турів; договірні відносини виникають безпосередньо між клієнтом та Організатором туру. Ці відносини регулюються Загальними умовами (VOP) обраного Організатора.
          </li>
          <li>
            Пропозиція турів регулярно оновлюється на основі даних із систем бронювання Організаторів. ТА гарантує ті ж ціни та право на такі ж знижки (First Minute, Last Minute), що й Організатор.
          </li>
        </ol>
      </section>

      <section>
        <h2>II. ЗАМОВЛЕННЯ ТА БРОНЮВАННЯ</h2>
        <ol>
          <li>Клієнт може надіслати запит на тур через веб-сайт, соціальні мережі (Instagram) або особисте спілкування (WhatsApp, Telegram).</li>
          <li>Отриманий запит не є обов'язковим. ТА перевірить наявність та ціну в системі Організатора, а потім створить опційне бронювання.</li>
          <li>Опційне бронювання обмежене в часі відповідно до правил Організатора (наприклад, для турів за 1–3 дні до вильоту воно може тривати лише 1 годину).</li>
          <li>ТА залишає за собою право відхиляти замовлення з невірними даними або неодноразово неоплачені бронювання.</li>
        </ol>
      </section>

      <section>
        <h2>III. ДОГОВІР ПРО ПОДОРОЖ (ДОГОВІР НА ТУР)</h2>
        <ol>
          <li>Після підтвердження розрахунку ТА надішле клієнту проєкт договору про подорож (від імені Організатора), Загальні умови Організатора, підтвердження страхування від банкрутства, процедуру розгляду скарг та стандартизовану форму з інформацією про тур.</li>
          <li>Договір стає обов'язковим з моменту його підтвердження Організатором.</li>
          <li>Клієнт несе відповідальність за точність усіх даних, зазначених у договорі на подорож (включаючи імена згідно з проїзними документами та громадянство).</li>
        </ol>
      </section>

      <section>
        <h2>IV. УМОВИ ОПЛАТИ</h2>
        <ol>
          <li>Остаточна ціна вказується в договоре на тур. Графік платежів (передоплати та доплати) регулюється умовами Організатора.</li>
          <li>Платежі перераховуються безпосередньо на рахунок Організатора або на рахунок ТА. У разі оплати на рахунок ТА, цей платіж негайно (не пізніше наступного робочого дня) переказується Організатору.</li>
          <li>Будь-який платіж вважається оплаченим тільки після зарахування суми на рахунок одержувача. ТА не несе відповідальності за наслідки, спричинені затримкою платежу клієнтом.</li>
        </ol>
      </section>

      <section>
        <h2>V. ПРОЇЗНІ ДОКУМЕНТИ ТА ОФОРМЛЕННЯ</h2>
        <ol>
          <li>Без повної оплати вартості туру клієнт не отримає необхідні документи (ваучери, квитки).</li>
          <li>Інструкції перед поїздкою зазвичай доступні в електронному вигляді за 7 днів до початку туру. Для пропозицій Last Minute вони видаються відразу після підтвердження бронювання та оплати.</li>
        </ol>
      </section>

      <section>
        <h2>VI. СКАСУВАННЯ ТУРУ (STORNO)</h2>
        <ol>
          <li>Клієнт може відмовитися від договору (скасувати тур) в будь-який час до його початку. Відмова має бути надіслана ТА у письмовій формі (електронною поштою).</li>
          <li>Комісія за скасування стягується відповідно до Загальних умов туроператора. ТА зобов'язується повідомити Організатора про скасування протягом 24 годин з моменту отримання запиту від клієнта.</li>
        </ol>
      </section>

      <section>
        <h2>VII. СКАРГИ (РЕКЛАМАЦІЇ)</h2>
        <ol>
          <li>Організатор несе відповідальність за належне надання послуг. ТА не уповноважена розглядати та ухвалювати рішення щодо скарг від імені Організатора.</li>
          <li>Клієнт подає скаргу Організатору, або може подати її через ТА. ТА передає належним чином оформлену скаргу Організатору без затримок, максимум протягом 24 годин.</li>
        </ol>
      </section>

      <section>
        <h2>VIII. ЗАХИСТ ПЕРСОНАЛЬНИХ ДАНИХ (GDPR)</h2>
        <ol>
          <li>ТА обробляє персональні дані клієнтів відповідно до регламенту GDPR.</li>
          <li>ТА виступає в ролі обробника; персональні дані передаються Організатору туру як контролеру в необхідному обсязі з метою виконання договору на подорож.</li>
          <li>Детальні принципи політики конфіденційності доступні на веб-сайті Sky-travel.tours.</li>
        </ol>
      </section>
    </>
  );
}

function RenderRu() {
  return (
    <>
      <section>
        <h1>Условия и Положения туристического агентства</h1>
        <p>Sky-travel.tours</p>
      </section>

      <section>
        <h2>I. ВВОДНЫЕ ПОЛОЖЕНИЯ</h2>
        <ol>
          <li>
            Туристическое агентство Sky-travel.tours, управляемое предпринимателем Ириной Терентьевой, IČO: 23973099 (далее «ТА»), является уполномоченным продавцом туров и туристических услуг, организованных чешскими и иностранными туроператорами (далее «Организатор»).
          </li>
          <li>
            Деятельность ТА осуществляется на основании надлежащих договоров коммерческого представительства, заключенных с отдельными Организаторами (например, Coral Travel s.r.o.).
          </li>
          <li>
            ТА не является организатором туров; договорные отношения возникают непосредственно между клиентом и Организатором тура. Эти отношения регулируются Общими условиями (VOP) выбранного Организатора.
          </li>
          <li>
            Предложение туров регулярно обновляется на основе данных из систем бронирования Организаторов. ТА гарантирует те же цены и право на такие же скидки (First Minute, Last Minute), что и Организатор.
          </li>
        </ol>
      </section>

      <section>
        <h2>II. ЗАКАЗЫ И БРОНИРОВАНИЯ</h2>
        <ol>
          <li>Клиент может отправить запрос на тур через веб-сайт, социальные сети (Instagram) или личное общение (WhatsApp, Telegram).</li>
          <li>Полученный запрос не является обязательным. ТА проверит наличие и цену в системе Организатора, а затем создаст опциональное бронирование.</li>
          <li>Опциональное бронирование ограничено по времени в соответствии с правилами Организатора (например, для туров за 1–3 дня до вылета оно может длиться всего 1 час).</li>
          <li>ТА оставляет за собой право отклонять заказы с неверными данными или неоднократно неоплаченные бронирования.</li>
        </ol>
      </section>

      <section>
        <h2>III. ДОГОВОР О ПУТЕШЕСТВИИ (ДОГОВОР НА ТУР)</h2>
        <ol>
          <li>После подтверждения расчета ТА отправит клиенту проект договора о путешествии (от имени Организатора), Общие условия Организатора, подтверждение страховки от банкротства, процедуру рассмотрения жалоб и стандартизированную форму с информацией о туре.</li>
          <li>Договор становится обязательным с момента его подтверждения Организатором.</li>
          <li>Клиент несет ответственность за точность всех данных, указанных в договоре на путешествие (включая имена согласно проездным документам и гражданство).</li>
        </ol>
      </section>

      <section>
        <h2>IV. УСЛОВИЯ ОПЛАТЫ</h2>
        <ol>
          <li>Окончательная цена указывается в договоре на тур. График платежей (предоплаты и доплаты) регулируется условиями Организатора.</li>
          <li>Платежи переводятся непосредственно на счет Организатора или на счет ТА. В случае оплаты на счет ТА, этот платеж немедленно (не позднее следующего рабочего дня) переводится Организатору.</li>
          <li>Любой платеж считается оплаченным только после зачисления суммы на счет получателя. ТА не несет ответственности за последствия, вызванные задержкой платежа клиентом.</li>
        </ol>
      </section>

      <section>
        <h2>V. ПРОЕЗДНЫЕ ДОКУМЕНТЫ И ОФОРМЛЕНИЕ</h2>
        <ol>
          <li>Без полной оплаты стоимости тура клиент не получит необходимые документы (ваучеры, билеты).</li>
          <li>Инструкции перед поездкой обычно доступны в электронном виде за 7 дней до начала тура. Для предложений Last Minute они выдаются сразу после подтверждения бронирования и оплаты.</li>
        </ol>
      </section>

      <section>
        <h2>VI. ОТМЕНА ТУРА (STORNO)</h2>
        <ol>
          <li>Клиент может отказаться от договора (отменить тур) в любое время до его начала. Отказ должен быть отправлен ТА в письменной форме (по электронной почте).</li>
          <li>Комиссия за отмену взимается в соответствии с Общими условиями туроператора. ТА обязуется уведомить Организатора об отмене в течение 24 часов с момента получения запроса от клиента.</li>
        </ol>
      </section>

      <section>
        <h2>VII. ЖАЛОБЫ (РЕКЛАМАЦИИ)</h2>
        <ol>
          <li>Организатор несет ответственность за надлежащее предоставление услуг. ТА не уполномочена рассматривать и принимать решения по жалобам от имени Организатора.</li>
          <li>Клиент подает жалобу Организатору, или может подать ее через ТА. ТА передает должным образом оформленную жалобу Организатору без задержек, максимум в течение 24 часов.</li>
        </ol>
      </section>

      <section>
        <h2>VIII. ЗАЩИТА ПЕРСОНАЛЬНЫХ ДАННЫХ (GDPR)</h2>
        <ol>
          <li>ТА обрабатывает персональные данные клиентов в соответствии с регламентом GDPR.</li>
          <li>ТА выступает в роли обработчика; персональные данные передаются Организатору тура как контролеру в необходимом объеме в целях выполнения договора.</li>
          <li>Подробные принципы политики конфиденциальности доступны на веб-сайте Sky-travel.tours.</li>
        </ol>
      </section>
    </>
  );
}

export default function TermsPage() {
  const { lang, t } = useLanguage();

  return (
    <main className="gdpr-page">
      <div className="gdpr-card">
        <header className="gdpr-header">
          <Link to="/" className="logo">
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </Link>
          <p>{t("footerTerms")}</p>
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
