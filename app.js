const SUPABASE_URL =
  "https://uvtbntwgooxqjbyjkvkd.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Ensrp6OEPwQCoY76nQMFDg_lEofX2qO";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


const $ = selector =>
  document.querySelector(selector);


const list =
  $("#experienceList");

const categoriesEl =
  $("#categories");

const categorySelect =
  $("#categorySelect");

const dialog =
  $("#shareDialog");

const form =
  $("#experienceForm");

const message =
  $("#formMessage");


let categories = [];


/* =========================
   LOAD CATEGORIES
========================= */

async function loadCategories() {

  const { data, error } =
    await supabaseClient
      .from("lived_categories")
      .select("id,name,slug")
      .order("name");

  if (error) {

    categoriesEl.innerHTML = "";

    return;
  }

  categories = data || [];

  categorySelect.innerHTML =
    '<option value="">Pilih kategori</option>' +

    categories
      .map(category => `
        <option value="${category.id}">
          ${escapeHtml(category.name)}
        </option>
      `)
      .join("");


  categoriesEl.innerHTML =
    `<button
      class="chip active"
      data-category=""
    >
      Semua
    </button>` +

    categories
      .map(category => `
        <button
          class="chip"
          data-category="${category.id}"
        >
          ${escapeHtml(category.name)}
        </button>
      `)
      .join("");


  categoriesEl
    .querySelectorAll(".chip")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          categoriesEl
            .querySelectorAll(".chip")
            .forEach(x =>
              x.classList.remove("active")
            );

          button.classList.add("active");

          loadExperiences(
            button.dataset.category
          );

        }
      );

    });

}


/* =========================
   LOAD EXPERIENCES
========================= */

async function loadExperiences(
  categoryId = ""
) {

  list.innerHTML =
    '<div class="empty">Memuat pengalaman...</div>';


  let query =
    supabaseClient
      .from("lived_experiences")
      .select(`
        id,
        title,
        situation,
        decision,
        outcome,
        lesson,
        is_anonymous,
        created_at,
        category_id
      `)
      .eq("status", "published")
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(30);


  if (categoryId) {

    query =
      query.eq(
        "category_id",
        Number(categoryId)
      );

  }


  const { data, error } =
    await query;


  if (error) {

    list.innerHTML =
      '<div class="empty">' +
      'Belum bisa memuat pengalaman.' +
      '</div>';

    return;
  }


  if (!data?.length) {

    list.innerHTML =
      '<div class="empty">' +
      'Belum ada pengalaman. Jadilah orang pertama yang berbagi.' +
      '</div>';

    return;
  }


  list.innerHTML =
    data.map(renderCard).join("");
}


/* =========================
   EXPERIENCE CARD
========================= */

function renderCard(experience) {

  const category =
    categories.find(
      category =>
        category.id ===
        experience.category_id
    );


  return `
    <article class="card">

      <div class="label">
        ${escapeHtml(
          category?.name ||
          "EXPERIENCE"
        )}
      </div>

      <h3>
        ${escapeHtml(
          experience.title
        )}
      </h3>

      <p>
        ${escapeHtml(
          shorten(
            experience.situation,
            170
          )
        )}
      </p>

      <p>
        <strong>Yang terjadi:</strong>
        ${escapeHtml(
          shorten(
            experience.outcome,
            180
          )
        )}
      </p>

      <div class="card-foot">

        <span>
          ${
            experience.is_anonymous
              ? "Anonymous"
              : "LIVED member"
          }
        </span>

        <span>
          ${formatDate(
            experience.created_at
          )}
        </span>

      </div>

    </article>
  `;
}


/* =========================
   SUBMIT EXPERIENCE
========================= */

async function submitExperience(event) {

  event.preventDefault();

  message.textContent = "";


  const formData =
    new FormData(form);


  const payload = {

    p_title:
      formData.get("title"),

    p_situation:
      formData.get("situation"),

    p_decision:
      formData.get("decision"),

    p_outcome:
      formData.get("outcome"),

    p_lesson:
      formData.get("lesson"),

    p_category_id:
      formData.get("category_id")
        ? Number(
            formData.get(
              "category_id"
            )
          )
        : null,

    p_is_anonymous:
      formData.get(
        "is_anonymous"
      ) === "on",

    p_publish: false

  };


  const { error } =
    await supabaseClient.rpc(
      "create_lived_experience",
      payload
    );


  if (error) {

    if (
      error.message
        ?.toLowerCase()
        .includes("login")
    ) {

      message.textContent =
        "Login dulu untuk membagikan pengalaman.";

    } else {

      message.textContent =
        error.message ||
        "Gagal menyimpan pengalaman.";

    }

    return;
  }


  dialog.close();

  form.reset();


  $("#toast").textContent =
    "Pengalaman tersimpan sebagai draft.";


  $("#toast")
    .classList.add("show");


  setTimeout(() => {

    $("#toast")
      .classList.remove("show");

  }, 2200);

}


/* =========================
   SHARE BUTTON
========================= */

$("#shareBtn")
  .addEventListener(
    "click",
    async () => {

      const {
        data: {
          session
        }
      } =
        await supabaseClient
          .auth
          .getSession();


      if (!session) {

        alert(
          "Login diperlukan untuk membagikan pengalaman."
        );

        return;
      }


      dialog.showModal();

    }
  );


/* =========================
   CLOSE MODAL
========================= */

$("#closeDialog")
  .addEventListener(
    "click",
    () => dialog.close()
  );


$("#cancelBtn")
  .addEventListener(
    "click",
    () => dialog.close()
  );


form.addEventListener(
  "submit",
  submitExperience
);


/* =========================
   SEARCH
========================= */

$("#searchForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const term =
        $("#searchInput")
          .value
          .trim()
          .toLowerCase();


      if (!term) {

        return loadExperiences();

      }


      const {
        data,
        error
      } =
        await supabaseClient
          .from(
            "lived_experiences"
          )
          .select(`
            id,
            title,
            situation,
            decision,
            outcome,
            lesson,
            is_anonymous,
            created_at,
            category_id
          `)
          .eq(
            "status",
            "published"
          )
          .or(
            `title.ilike.%${term}%,situation.ilike.%${term}%,outcome.ilike.%${term}%,lesson.ilike.%${term}%`
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          )
          .limit(30);


      if (
        error ||
        !data?.length
      ) {

        list.innerHTML =
          '<div class="empty">' +
          "Nggak ketemu pengalaman yang cocok." +
          "</div>";

        return;
      }


      list.innerHTML =
        data.map(renderCard).join("");

    }
  );


/* =========================
   LOGIN
========================= */

$("#loginBtn")
  .addEventListener(
    "click",
    async () => {

      const email =
        prompt(
          "Masukkan email untuk magic link:"
        );


      if (!email) return;


      const {
        error
      } =
        await supabaseClient
          .auth
          .signInWithOtp({

            email,

            options: {
              emailRedirectTo:
                window.location.href
            }

          });


      alert(
        error
          ? error.message
          : "Magic link sudah dikirim. Cek email kamu."
      );

    }
  );


/* =========================
   HELPERS
========================= */

function escapeHtml(
  value = ""
) {

  return String(value)
    .replace(
      /[&<>"']/g,
      character => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[character])
    );

}


function shorten(
  value,
  max
) {

  const text =
    String(value || "");


  return text.length > max
    ? text.slice(0, max).trim() + "…"
    : text;

}


function formatDate(
  value
) {

  try {

    return new Intl.DateTimeFormat(
      "id-ID",
      {
        dateStyle: "medium"
      }
    ).format(
      new Date(value)
    );

  } catch {

    return "";

  }

}


/* =========================
   INIT
========================= */

(async function init() {

  await loadCategories();

  await loadExperiences();

})();
