const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const mobileNav = document.querySelector('[data-mobile-nav]');
const previewDialog = document.querySelector('[data-preview-dialog]');
const demoDialog = document.querySelector('[data-demo-dialog]');

const setHeaderState = () => header?.classList.toggle('scrolled', window.scrollY > 8);
setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

menuButton?.addEventListener('click', () => {
  const open = mobileNav?.classList.toggle('open') ?? false;
  menuButton.setAttribute('aria-expanded', String(open));
});

mobileNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.count);
      const suffix = element.dataset.suffix ?? '';
      const startedAt = performance.now();
      const animate = (now) => {
        const progress = Math.min((now - startedAt) / 900, 1);
        const eased = 1 - (1 - progress) ** 3;
        element.textContent = `${Math.round(target * eased)}${suffix}`;
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      countObserver.unobserve(element);
    });
  },
  { threshold: 0.7 },
);

document.querySelectorAll('[data-count]').forEach((element) => countObserver.observe(element));

document.querySelectorAll('.faq-item > button').forEach((button) => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.faq-item > button').forEach((otherButton) => {
      otherButton.setAttribute('aria-expanded', 'false');
      otherButton.querySelector('i').textContent = '+';
      otherButton.nextElementSibling.hidden = true;
    });
    if (!expanded) {
      button.setAttribute('aria-expanded', 'true');
      button.querySelector('i').textContent = '−';
      button.nextElementSibling.hidden = false;
    }
  });
});

const courseCopy = {
  middle: [
    [
      'الرياضيات · الصف الثاني الإعدادي',
      'أساسيات الجبر',
      'من لغة الرموز إلى حل المعادلة، بخطوات قصيرة وتمارين توضّح الفكرة.',
    ],
    [
      'العلوم · الصف الأول الإعدادي',
      'المادة وتغيّراتها',
      'شاهد ما يحدث، توقّع النتيجة، ثم ثبّت الفهم بتجربة وسؤال.',
    ],
    [
      'الرياضيات · الصف الثالث الإعدادي',
      'مراجعة ذكية قبل الامتحان',
      'خريطة مركّزة لأكثر الأفكار تكراراً مع قياس فوري لنقاط الضعف.',
    ],
  ],
  primary: [
    [
      'الرياضيات · الصف الرابع الابتدائي',
      'الكسور ببساطة',
      'صور وأمثلة قريبة تجعل الجزء والكل فكرة يمكن رؤيتها وفهمها.',
    ],
    [
      'العلوم · الصف الخامس الابتدائي',
      'رحلة الطاقة',
      'من الضوء إلى الحركة، تجارب صغيرة تربط المصطلح بما يحدث حولك.',
    ],
    [
      'الرياضيات · الصف السادس الابتدائي',
      'النسبة والتناسب',
      'تدريب متدرّج ينقل الطالب من المثال إلى الحل المستقل بثقة.',
    ],
  ],
  secondary: [
    [
      'الرياضيات · الصف الأول الثانوي',
      'أساسيات حساب المثلثات',
      'افهم العلاقة بين الزاوية والأضلاع قبل حفظ أي قانون.',
    ],
    [
      'العلوم · الصف الثاني الثانوي',
      'الميكانيكا في مسائل',
      'من رسم المسألة إلى اختيار القانون والتحقق من منطق الإجابة.',
    ],
    [
      'الرياضيات · الصف الثالث الثانوي',
      'مراجعة التفاضل',
      'مسار مركز يكتشف الفجوات ويعيد أهم الأنماط قبل الامتحان.',
    ],
  ],
};

document.querySelectorAll('[data-grade]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-grade]').forEach((otherTab) => {
      const selected = otherTab === tab;
      otherTab.classList.toggle('active', selected);
      otherTab.setAttribute('aria-selected', String(selected));
    });
    const cards = document.querySelectorAll('[data-course-grid] .course-card');
    courseCopy[tab.dataset.grade].forEach(([meta, title, description], index) => {
      const card = cards[index];
      card.querySelector('.course-meta').textContent = meta;
      card.querySelector('h3').textContent = title;
      card.querySelector('h3 + p').textContent = description;
      card.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 260, easing: 'ease-out' },
      );
    });
  });
});

document.querySelectorAll('[data-preview-action]').forEach((button) => {
  button.addEventListener('click', () => previewDialog?.showModal());
});

document
  .querySelector('[data-demo-button]')
  ?.addEventListener('click', () => demoDialog?.showModal());

document.querySelectorAll('[data-dialog-close]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog')?.close());
});

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});
