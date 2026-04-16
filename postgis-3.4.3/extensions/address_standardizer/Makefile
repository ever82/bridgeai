include ./../upgradeable_versions.mk
OBJS = \
    address_parser.o \
    address_standardizer.o \
    std_pg_hash.o \
    analyze.o \
    err_param.o \
    export.o \
    gamma.o \
    hash.o \
    lexicon.o \
    pagc_tools.o \
    parseaddress-api.o \
    standard.o \
    tokenize.o

OBJS_test_main = \
    test_main.o \
    analyze.o \
    err_param.o \
    export.o \
    gamma.o \
    hash.o \
    lexicon.o \
    pagc_tools.o \
    standard.o \
    tokenize.o

POSTGIS_PGSQL_VERSION=130
# SQL preprocessor
SQLPP = /usr/bin/cpp -traditional-cpp -w -P -Upixel -Ubool
GREP=/bin/grep
EXTVERSION = 3.4.3
MODULE_big = address_standardizer-3
MODULEPATH    = $$libdir/address_standardizer-3
ifeq (no,yes)
MODULE_big = address_standardizer-3.4
MODULEPATH    = $$libdir/address_standardizer-3.4
endif
EXTENSION = address_standardizer
EXTENSION_SCRIPTS = \
 		sql/address_standardizer_types.sql \
    sql/address_standardizer_functions.sql

DATA_built = \
	$(EXTENSION).control \
	$(EXTENSION)_data_us.control \
	$(NULL)

all:  sql/address_standardizer_pre.sql sql/address_standardizer.sql sql/address_standardizer--1.0--$(EXTVERSION).sql sql/$(EXTENSION)--$(EXTVERSION).sql sql/$(EXTENSION)--ANY--$(EXTVERSION).sql \
 sql/$(EXTENSION)_data_us.sql sql/address_standardizer--3.4.3.sql sql/$(EXTENSION)_data_us--3.4.3.sql  sql/$(EXTENSION)_data_us--$(EXTVERSION)--$(EXTVERSION)next.sql \
sql/$(EXTENSION)_data_us--$(EXTVERSION)next--$(EXTVERSION).sql sql/$(EXTENSION)_data_us--ANY--$(EXTVERSION).sql \
sql/test-init-extensions.sql sql/test-parseaddress.sql sql/test-standardize_address_1.sql sql/test-standardize_address_2.sql sql/test-debug_standardize_address.sql

DOCS = README.address_standardizer
PG_CPPFLAGS = -std=gnu99 -g -O2 -fno-math-errno -fno-signed-zeros -Wall  -I/var/lib/jenkins/workspace/geos/rel-3.10w64/include   -I/usr/include/libxml2 -I/usr/include -I/usr/include/json-c  -DNDEBUG  -DPCRE_VERSION=0

SHLIB_LINK =  -L/var/lib/jenkins/workspace/geos/rel-3.10w64/lib -lgeos_c -lproj -ljson-c -lprotobuf-c -lxml2 -L/usr/lib/x86_64-linux-gnu -lSFCGAL -lgmpxx -Wl,--exclude-libs,ALL  -lm 
EXTRA_CLEAN = sql/ usps-st-city-name.txt mk-st-regexp mk-city-regex test_main
REGRESS = test-init-extensions test-parseaddress test-standardize_address_1 test-standardize_address_2 test-debug_standardize_address

sql:
	mkdir -p $@

# Borrow the $libdir substitution from PGXS but customise by running the preprocessor
# and adding the version number
sql/%.sql: %.sql.in | sql
	$(SQLPP) -I@buiddir@/../libpgcommon $< > $@.tmp
	grep -v '^#' $@.tmp | \
	$(PERL) -lpe "s'MODULE_PATHNAME'\$(MODULEPATH)'g" > $@
	rm -f $@.tmp

%.control: %.control.in Makefile
	cat $< \
		| $(PERL) -lpe "s'@EXTVERSION@'$(EXTVERSION)'g" \
		> $@

sql/address_standardizer_pre.sql: $(EXTENSION_SCRIPTS) | sql
	cat $^ > $@

sql/address_standardizer--$(EXTVERSION).sql: sql/address_standardizer_pre.sql ../../utils/create_or_replace_to_create.pl | sql
	cat $< \
		| $(PERL) ../../utils/create_or_replace_to_create.pl sql/address_standardizer_pre.sql \
		> $@

sql/address_standardizer.sql: sql/address_standardizer_pre.sql ../../utils/create_or_replace_to_create.pl | sql
	cat $< \
		| $(PERL) ../../utils/create_or_replace_to_create.pl sql/address_standardizer_pre.sql \
		> $@

EXTENSION_UPGRADE_SCRIPTS = sql/address_standardizer_functions.sql

# upgrade logic for us data extension (to go to original round-robin yoyo cludge for dev upgrading)
sql/$(EXTENSION)--1.0--$(EXTVERSION).sql: sql/address_standardizer_functions.sql | sql
	cat $^ > $@

sql/$(EXTENSION)--$(EXTVERSION)next--$(EXTVERSION).sql: sql/address_standardizer_functions.sql | sql
	cat $^ > $@

# build us data extension
sql/$(EXTENSION)_data_us--$(EXTVERSION).sql: us_lex.sql us_gaz.sql us_rules.sql sql_bits/address_standardizer_data_us_mark_editable_objects.sql.in | sql
	cat $^ > $@

sql/$(EXTENSION)_data_us.sql: us_lex.sql us_gaz.sql us_rules.sql sql_bits/address_standardizer_data_us_mark_editable_objects.sql.in | sql
	cat $^ > $@

# upgrade logic for us data extension (to go to next cludge for dev upgrading)
sql/$(EXTENSION)_data_us--$(EXTVERSION)--$(EXTVERSION)next.sql: sql/$(EXTENSION)_data_us--$(EXTVERSION).sql | sql
	cat $^ > $@

# upgrade logic for us data extension (to go to original round-robin yoyo cludge for dev upgrading)
sql/$(EXTENSION)_data_us--$(EXTVERSION)next--$(EXTVERSION).sql: sql/$(EXTENSION)_data_us--$(EXTVERSION).sql | sql
	cat $^ > $@


sql/$(EXTENSION)--ANY--$(EXTVERSION).sql: $(EXTENSION_UPGRADE_SCRIPTS)
	cat $(EXTENSION_UPGRADE_SCRIPTS) > $@

sql/$(EXTENSION)_data_us--ANY--$(EXTVERSION).sql: sql/$(EXTENSION)_data_us--$(EXTVERSION).sql | sql
	cat $^ > $@

include ./../upgrade-paths-rules.mk

# TODO: fix this by moving data in their own directories
ifeq ($(EXTENSION_DATA_INSTALL),)
LANGUAGES = us
install-upgrade-paths: install-upgrade-paths-data
install-extension-upgrades-from-known-versions: install-extension-upgrades-from-known-versions-data
install-upgrade-paths-data install-extension-upgrades-from-known-versions-data:
	TARGET=`echo $@ | sed 's/-data$$//'`; \
	for lang in $(LANGUAGES); do \
		EXTENSION_DATA_INSTALL=1 \
		$(MAKE) $${TARGET} \
		EXTENSION=$(EXTENSION)_data_$${lang} \
		|| exit 1; \
	done
endif

mk-st-regexp: mk-st-regexp.pl
	$(PERL) -c mk-st-regexp.pl
	rm -f mk-st-regexp
	echo "#! " $(PERL) > mk-st-regexp
	cat mk-st-regexp.pl >> mk-st-regexp
	chmod ugo+x mk-st-regexp

mk-city-regex: mk-city-regex.pl usps-st-city-name.txt
	$(PERL) -c mk-city-regex.pl
	rm -f mk-city-regex
	echo "#! " $(PERL) > mk-city-regex
	cat mk-city-regex.pl >> mk-city-regex
	chmod ugo+x mk-city-regex

usps-st-city-name.txt: usps-st-city-orig.txt usps-st-city-adds.txt
	cat usps-st-city-orig.txt usps-st-city-adds.txt | sort -u >usps-st-city-name.txt

#parseaddress-stcities.h: mk-city-regex
#	./mk-city-regex > parseaddress-stcities.h

#parseaddress-regex.h: mk-st-regexp
#	./mk-st-regexp > parseaddress-regex.h

dist-clean:
	rm -f mk-st-regexp mk-city-regex usps-st-city-name.txt test_main Makefile


test_main: $(OBJS_test_main)
	gcc -o test_main $(OBJS_test_main) $(LDFLAGS) $(LIBS)

test_main.o: test_main.c pagc_api.h pagc_std_api.h

address_parser.o: address_parser.c parseaddress-api.h

address_standardizer.o: address_standardizer.c std_pg_hash.h pagc_api.h pagc_std_api.h

analyze.o: analyze.c pagc_api.h

err_param.o: err_param.c pagc_api.h

export.o: export.c pagc_api.h pagc_tools.h

gamma.o: gamma.c pagc_api.h pagc_std_api.h gamma.h

hash.o: hash.c hash.h khash.h

lexicon.o: lexicon.c pagc_api.h pagc_std_api.h

pagc_tools.o: pagc_tools.c pagc_tools.h pagc_common.h

parseaddress-api.o: parseaddress-api.c parseaddress-api.h parseaddress-stcities.h parseaddress-regex.h

standard.o: standard.c pagc_api.h

tokenize.o: tokenize.c pagc_api.h

std_pg_hash.o: std_pg_hash.c std_pg_hash.h pagc_api.h pagc_std_api.h

#only extension files
DATA_built += $(wildcard sql/*--*.sql)
EXTRA_CLEAN += $(wildcard expected/*--*.out)
EXTRA_CLEAN += *.a *.so *.dll

distclean: clean
	rm Makefile

PG_CONFIG := /var/lib/jenkins/workspace/pg/rel/pg13w64/bin/pg_config
PGXS := /var/lib/jenkins/workspace/pg/rel/pg13w64/lib/postgresql/pgxs/src/makefiles/pgxs.mk
include $(PGXS)
PERL = /usr/bin/perl
INSTALL=/usr/bin/install -c
INSTALL_DATA=${INSTALL} -m 644
ifneq (/bin/mkdir -p,)
	MKDIR_P = /bin/mkdir -p
endif

srcdir = .
top_srcdir = ../..
abs_topbuilddir=$(abspath $(top_builddir))

# Overriding top_builddir breaks the "installcheck"
# target from PGXS. TODO: integrate regression tests
# with the rest of the application
#top_builddir = ../..



INSTALLED_UPGRADE_SCRIPTS +=  \
	$(wildcard $(EXTDIR)/$(EXTENSION)_data_us--*--$(EXTVERSION).sql) \
	$(wildcard $(EXTDIR)/$(EXTENSION)_data_us--*--ANY.sql) \
	$(NULL)

install: all installdirs
	$(INSTALL_DATA) $(addprefix $(srcdir)/, $(DATA)) $(DATA_built) '$(DESTDIR)$(datadir)/$(datamoduledir)/'
ifdef DOCS
ifdef docdir
	$(INSTALL_DATA) $(addprefix $(srcdir)/, $(DOCS)) '$(DESTDIR)$(docdir)/$(docmoduledir)/'
endif # docdir
endif # DOCS
ifdef MODULE_big
ifeq ($(with_llvm), yes)
	$(call install_llvm_module,$(MODULE_big),$(OBJS))
endif # with_llvm
install: install-lib
endif # MODULE_big
